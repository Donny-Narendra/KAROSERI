-- ==============================================================================
-- STEP 1: FINANCIAL REPORTING DATABASE VIEWS
-- ROBELKAROSERI WORKSHOP MANAGEMENT SYSTEM
-- File: supabase/migrations/20261016_financial_reporting_views.sql
-- ==============================================================================

-- ==============================================================================
-- 0. COMPATIBILITY & UNDERLYING AGGREGATION ADAPTERS
-- Menjamin isolasi struktur operasional tanpa merusak tabel transaksi berjalan
-- ==============================================================================

-- A. Pastikan spk memiliki spk_number sebagai alias immutable spk_no
ALTER TABLE public.spk 
ADD COLUMN IF NOT EXISTS spk_number TEXT GENERATED ALWAYS AS (spk_no) STORED;

-- B. Pastikan materials memiliki category dan updated_at
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- C. Helper fungsi konversi wbs_category ke format wbs_stage
CREATE OR REPLACE FUNCTION public.wbs_category_to_stage(p_cat wbs_category)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
  SELECT CASE p_cat::text
    WHEN 'Pembongkaran' THEN 'WBS 1: Pembongkaran'
    WHEN 'Sasis/Rangka' THEN 'WBS 2: Sasis/Rangka'
    WHEN 'Dinding/Fabrikasi' THEN 'WBS 3: Dinding/Fabrikasi'
    WHEN 'Cat/Finishing' THEN 'WBS 4: Cat/Finishing'
    WHEN 'Kelistrikan/Hidrolik' THEN 'WBS 5: Kelistrikan/Hidrolik'
    ELSE COALESCE(p_cat::text, 'WBS 1: Pembongkaran')
  END;
$$;

-- D. Sinkronisasi kolom wbs_stage dan total_amount pada spk_borongan
ALTER TABLE public.spk_borongan 
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(15,2) GENERATED ALWAYS AS (contract_value) STORED,
ADD COLUMN IF NOT EXISTS wbs_stage TEXT GENERATED ALWAYS AS (wbs_category_to_stage(wbs_category)) STORED;

-- E. Sinkronisasi kolom wbs_stage dan item_type pada rab_items
ALTER TABLE public.rab_items 
ADD COLUMN IF NOT EXISTS wbs_stage TEXT GENERATED ALWAYS AS (wbs_category_to_stage(wbs_category)) STORED,
ADD COLUMN IF NOT EXISTS item_type TEXT GENERATED ALWAYS AS (
  CASE 
    WHEN (labor_hours > 0 OR labor_rate > 0) THEN 'LABOR'
    ELSE 'MATERIAL'
  END
) STORED;

-- F. View material_issues menghubungkan transaksi fisik riil inventory_transactions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'material_issues') THEN
    EXECUTE 'DROP VIEW public.material_issues CASCADE';
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'material_issues') THEN
    EXECUTE 'DROP TABLE public.material_issues CASCADE';
  END IF;
END $$;

CREATE OR REPLACE VIEW public.material_issues AS
SELECT 
  it.id,
  it.spk_id,
  it.material_id,
  it.quantity_issued AS quantity,
  COALESCE(it.custom_unit_price, m.cost_price, m.unit_price, 0) AS unit_price,
  COALESCE(
    wbs_category_to_stage(mr.wbs_category), 
    'WBS 1: Pembongkaran'
  ) AS wbs_stage,
  it.issued_by_user_id,
  it.issued_by_name,
  it.issued_by_role,
  it.audit_notes,
  it.issued_at AS created_at
FROM inventory_transactions it
LEFT JOIN materials m ON it.material_id = m.id
LEFT JOIN material_requisitions mr ON it.requisition_id = mr.id
WHERE it.status = 'ACTIVE' OR it.status IS NULL;

-- G. View final_billing menghubungkan faktur penagihan invoices & status pelunasan
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'final_billing') THEN
    EXECUTE 'DROP VIEW public.final_billing CASCADE';
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'final_billing') THEN
    EXECUTE 'DROP TABLE public.final_billing CASCADE';
  END IF;
END $$;

CREATE OR REPLACE VIEW public.final_billing AS
SELECT 
  inv.id,
  inv.spk_id,
  COALESCE('INV-' || UPPER(SUBSTRING(inv.id::text, 1, 8)), 'INV-DRAFT') AS invoice_number,
  COALESCE(inv.total_amount, 0) AS total_amount,
  COALESCE(inv.dp_amount, 0) AS dp_amount,
  CASE 
    WHEN inv.status = 'LUNAS' THEN COALESCE(inv.total_amount, 0) - COALESCE(inv.dp_amount, 0)
    ELSE 0 
  END AS paid_amount,
  COALESCE(inv.status, 'UNPAID') AS payment_status,
  inv.created_at,
  inv.updated_at
FROM invoices inv;

-- Izin akses view perantara
GRANT SELECT ON public.material_issues TO authenticated;
GRANT SELECT ON public.final_billing TO authenticated;


-- ==============================================================================
-- 1. VIEW LABA RUGI PER PROYEK SPK (JOB PROFITABILITY REPORT)
-- ==============================================================================
CREATE OR REPLACE VIEW view_spk_job_profitability AS
WITH material_costs AS (
  SELECT 
    spk_id,
    COALESCE(SUM(quantity * unit_price), 0) AS total_actual_material_cost
  FROM material_issues
  GROUP BY spk_id
),
labor_costs AS (
  SELECT 
    spk_id,
    COALESCE(SUM(total_amount), 0) AS total_actual_labor_cost
  FROM spk_borongan
  GROUP BY spk_id
),
billing_totals AS (
  SELECT 
    spk_id,
    COALESCE(SUM(total_amount), 0) AS final_invoice_amount,
    COALESCE(SUM(dp_amount), 0) AS dp_received,
    MAX(payment_status) AS latest_payment_status
  FROM final_billing
  GROUP BY spk_id
)
SELECT 
  s.id AS spk_id,
  s.spk_number,
  s.customer_name,
  s.customer_phone,
  s.vehicle_plate,
  s.status AS spk_status,
  s.created_at AS registration_date,
  s.target_date,
  COALESCE(b.final_invoice_amount, 0) AS total_revenue,
  COALESCE(m.total_actual_material_cost, 0) AS actual_material_cost,
  COALESCE(l.total_actual_labor_cost, 0) AS actual_labor_cost,
  (COALESCE(m.total_actual_material_cost, 0) + COALESCE(l.total_actual_labor_cost, 0)) AS total_cogs, -- HPP Aktual
  (COALESCE(b.final_invoice_amount, 0) - (COALESCE(m.total_actual_material_cost, 0) + COALESCE(l.total_actual_labor_cost, 0))) AS gross_profit,
  CASE 
    WHEN COALESCE(b.final_invoice_amount, 0) > 0 THEN 
      ROUND((((b.final_invoice_amount - (COALESCE(m.total_actual_material_cost, 0) + COALESCE(l.total_actual_labor_cost, 0))) / b.final_invoice_amount) * 100), 2)
    ELSE 0 
  END AS gross_margin_percentage,
  COALESCE(b.latest_payment_status, 'UNBILLED') AS payment_status
FROM spk s
LEFT JOIN material_costs m ON s.id = m.spk_id
LEFT JOIN labor_costs l ON s.id = l.spk_id
LEFT JOIN billing_totals b ON s.id = b.spk_id;


-- ==============================================================================
-- 2. VIEW ANALISIS VARIAN ANGGARAN (RAB VS ACTUAL VARIANCE PER WBS)
-- ==============================================================================
CREATE OR REPLACE VIEW view_wbs_cost_variance AS
WITH rab_budget AS (
  SELECT 
    spk_id,
    wbs_stage,
    COALESCE(SUM(CASE WHEN item_type = 'MATERIAL' THEN quantity * unit_price ELSE 0 END), 0) AS rab_material_budget,
    COALESCE(SUM(CASE WHEN item_type = 'LABOR' THEN quantity * unit_price ELSE 0 END), 0) AS rab_labor_budget
  FROM rab_items
  GROUP BY spk_id, wbs_stage
),
co_budget AS (
  SELECT 
    spk_id,
    wbs_stage,
    COALESCE(SUM(CASE WHEN item_type = 'MATERIAL' THEN quantity * unit_price ELSE 0 END), 0) AS co_material_budget,
    COALESCE(SUM(CASE WHEN item_type = 'LABOR' THEN quantity * unit_price ELSE 0 END), 0) AS co_labor_budget
  FROM change_order_items
  GROUP BY spk_id, wbs_stage
),
actual_material AS (
  SELECT 
    spk_id,
    wbs_stage,
    COALESCE(SUM(quantity * unit_price), 0) AS actual_material_spent
  FROM material_issues
  GROUP BY spk_id, wbs_stage
),
actual_labor AS (
  SELECT 
    spk_id,
    wbs_stage,
    COALESCE(SUM(total_amount), 0) AS actual_labor_spent
  FROM spk_borongan
  GROUP BY spk_id, wbs_stage
)
SELECT 
  s.id AS spk_id,
  s.spk_number,
  s.customer_name,
  s.vehicle_plate,
  rb.wbs_stage,
  -- Pagu Material (RAB Awal + Change Orders)
  (COALESCE(rb.rab_material_budget, 0) + COALESCE(cb.co_material_budget, 0)) AS total_material_budget,
  COALESCE(am.actual_material_spent, 0) AS actual_material_spent,
  ((COALESCE(rb.rab_material_budget, 0) + COALESCE(cb.co_material_budget, 0)) - COALESCE(am.actual_material_spent, 0)) AS material_variance,
  -- Pagu Jasa / Labor
  (COALESCE(rb.rab_labor_budget, 0) + COALESCE(cb.co_labor_budget, 0)) AS total_labor_budget,
  COALESCE(al.actual_labor_spent, 0) AS actual_labor_spent,
  ((COALESCE(rb.rab_labor_budget, 0) + COALESCE(cb.co_labor_budget, 0)) - COALESCE(al.actual_labor_spent, 0)) AS labor_variance
FROM rab_budget rb
JOIN spk s ON rb.spk_id = s.id
LEFT JOIN co_budget cb ON rb.spk_id = cb.spk_id AND rb.wbs_stage = cb.wbs_stage
LEFT JOIN actual_material am ON rb.spk_id = am.spk_id AND rb.wbs_stage = am.wbs_stage
LEFT JOIN actual_labor al ON rb.spk_id = al.spk_id AND rb.wbs_stage = al.wbs_stage;


-- ==============================================================================
-- 3. VIEW VALUASI MUTASI & PERSEDIAAN GUDANG (INVENTORY VALUATION)
-- ==============================================================================
CREATE OR REPLACE VIEW view_inventory_valuation AS
SELECT 
  id AS material_id,
  name AS material_name,
  category,
  unit,
  current_stock,
  COALESCE(cost_price, 0) AS cost_price_hpp,
  COALESCE(selling_price, 0) AS standard_selling_price,
  (current_stock * COALESCE(cost_price, 0)) AS total_inventory_valuation_hpp,
  (current_stock * COALESCE(selling_price, 0)) AS total_inventory_market_value,
  updated_at AS last_inventory_update
FROM materials;


-- ==============================================================================
-- 4. VIEW PIUTANG PROYEK & KONTROL SERAH TERIMA (PROJECT RECEIVABLES & AGING)
-- ==============================================================================
CREATE OR REPLACE VIEW view_project_receivables AS
SELECT 
  s.id AS spk_id,
  s.spk_number,
  s.customer_name,
  s.customer_phone,
  s.vehicle_plate,
  s.status AS spk_status,
  s.qc_status,
  b.id AS billing_id,
  b.invoice_number,
  COALESCE(b.total_amount, 0) AS total_billing_amount,
  COALESCE(b.dp_amount, 0) AS dp_paid,
  COALESCE(b.paid_amount, 0) AS additional_paid,
  (COALESCE(b.total_amount, 0) - (COALESCE(b.dp_amount, 0) + COALESCE(b.paid_amount, 0))) AS outstanding_balance,
  b.payment_status,
  b.created_at AS invoice_date,
  CASE 
    WHEN (COALESCE(b.total_amount, 0) - (COALESCE(b.dp_amount, 0) + COALESCE(b.paid_amount, 0))) > 0 THEN 
      DATE_PART('day', NOW() - b.created_at)::INTEGER
    ELSE 0 
  END AS receivable_aging_days,
  CASE 
    WHEN (COALESCE(b.total_amount, 0) - (COALESCE(b.dp_amount, 0) + COALESCE(b.paid_amount, 0))) <= 0 THEN 'LUNAS (SIAP HANDOVER)'
    WHEN s.qc_status = 'PASS' AND (COALESCE(b.total_amount, 0) - (COALESCE(b.dp_amount, 0) + COALESCE(b.paid_amount, 0))) > 0 THEN 'UNIT SELESAI (TERTAHAN PELUNASAN)'
    ELSE 'PENGERJAAN BERJALAN'
  END AS handover_clearance_status
FROM spk s
JOIN final_billing b ON s.id = b.spk_id;


-- ==============================================================================
-- 5. GRANTS & RLS ACCESS UNTUK ROLE TERKAIT
-- ==============================================================================
GRANT SELECT ON view_spk_job_profitability TO authenticated;
GRANT SELECT ON view_wbs_cost_variance TO authenticated;
GRANT SELECT ON view_inventory_valuation TO authenticated;
GRANT SELECT ON view_project_receivables TO authenticated;
