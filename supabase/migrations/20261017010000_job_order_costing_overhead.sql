-- ==============================================================================
-- MIGRATION: 20261017010000_job_order_costing_overhead.sql
-- Description: Implement spk_overhead_logs and update financial database views for 3-element job order costing
-- 1. Direct Material (material_issues)
-- 2. Direct Labor (spk_borongan)
-- 3. Factory Overhead (spk_overhead_logs)
-- ==============================================================================

-- 1. Buat Tabel Realisasi Pembebanan Overhead Proyek
CREATE TABLE IF NOT EXISTS public.spk_overhead_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spk_id UUID NOT NULL REFERENCES public.spk(id) ON DELETE CASCADE,
  wbs_stage VARCHAR(50) NOT NULL,
  overhead_name VARCHAR(150) NOT NULL, -- e.g. "Pemakaian Bay & Listrik Mesin", "Sewa Alat Derek"
  frequency_qty NUMERIC(10, 2) NOT NULL DEFAULT 1, -- Durasi / Frekuensi aktual
  rate_per_unit NUMERIC(15, 2) NOT NULL DEFAULT 0, -- Bay rate per frekuensi
  total_amount NUMERIC(15, 2) GENERATED ALWAYS AS (frequency_qty * rate_per_unit) STORED,
  notes TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_spk_overhead_logs_spk_id ON public.spk_overhead_logs(spk_id);
CREATE INDEX IF NOT EXISTS idx_spk_overhead_logs_wbs_stage ON public.spk_overhead_logs(wbs_stage);

ALTER TABLE public.spk_overhead_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read spk_overhead_logs" ON public.spk_overhead_logs;
CREATE POLICY "Allow authenticated read spk_overhead_logs" ON public.spk_overhead_logs
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert spk_overhead_logs" ON public.spk_overhead_logs;
CREATE POLICY "Allow authenticated insert spk_overhead_logs" ON public.spk_overhead_logs
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update spk_overhead_logs" ON public.spk_overhead_logs;
CREATE POLICY "Allow authenticated update spk_overhead_logs" ON public.spk_overhead_logs
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated delete spk_overhead_logs" ON public.spk_overhead_logs;
CREATE POLICY "Allow authenticated delete spk_overhead_logs" ON public.spk_overhead_logs
  FOR DELETE TO authenticated USING (true);

-- 2. Perbarui VIEW Analisis Varian Anggaran WBS (3 Pilar Varian)
DROP VIEW IF EXISTS public.view_wbs_cost_variance CASCADE;

CREATE OR REPLACE VIEW public.view_wbs_cost_variance AS
WITH rab_budget AS (
  SELECT 
    spk_id,
    wbs_stage,
    COALESCE(SUM(CASE WHEN item_type = 'MATERIAL' OR item_type IS NULL THEN quantity * unit_price ELSE 0 END), 0) AS rab_material_budget,
    COALESCE(SUM(CASE WHEN item_type = 'LABOR' THEN quantity * unit_price ELSE 0 END), 0) AS rab_labor_budget,
    COALESCE(SUM(CASE WHEN item_type = 'OVERHEAD' THEN quantity * unit_price ELSE 0 END), 0) AS rab_overhead_budget
  FROM rab_items
  GROUP BY spk_id, wbs_stage
),
co_budget AS (
  SELECT 
    spk_id,
    wbs_stage,
    COALESCE(SUM(CASE WHEN item_type = 'MATERIAL' OR item_type IS NULL THEN quantity * unit_price ELSE 0 END), 0) AS co_material_budget,
    COALESCE(SUM(CASE WHEN item_type = 'LABOR' THEN quantity * unit_price ELSE 0 END), 0) AS co_labor_budget,
    COALESCE(SUM(CASE WHEN item_type = 'OVERHEAD' THEN quantity * unit_price ELSE 0 END), 0) AS co_overhead_budget
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
),
actual_foh AS (
  SELECT 
    spk_id,
    wbs_stage,
    COALESCE(SUM(total_amount), 0) AS actual_overhead_spent
  FROM spk_overhead_logs
  GROUP BY spk_id, wbs_stage
)
SELECT 
  s.id AS spk_id,
  s.spk_number,
  s.customer_name,
  s.vehicle_plate,
  rb.wbs_stage,
  
  -- 1. Pilar Bahan Baku
  (COALESCE(rb.rab_material_budget, 0) + COALESCE(cb.co_material_budget, 0)) AS total_material_budget,
  COALESCE(am.actual_material_spent, 0) AS actual_material_spent,
  ((COALESCE(rb.rab_material_budget, 0) + COALESCE(cb.co_material_budget, 0)) - COALESCE(am.actual_material_spent, 0)) AS material_variance,
  
  -- 2. Pilar Tenaga Kerja (Labor)
  (COALESCE(rb.rab_labor_budget, 0) + COALESCE(cb.co_labor_budget, 0)) AS total_labor_budget,
  COALESCE(al.actual_labor_spent, 0) AS actual_labor_spent,
  ((COALESCE(rb.rab_labor_budget, 0) + COALESCE(cb.co_labor_budget, 0)) - COALESCE(al.actual_labor_spent, 0)) AS labor_variance,

  -- 3. Pilar Overhead Pabrikasi (FOH)
  (COALESCE(rb.rab_overhead_budget, 0) + COALESCE(cb.co_overhead_budget, 0)) AS total_overhead_budget,
  COALESCE(foh.actual_overhead_spent, 0) AS actual_overhead_spent,
  ((COALESCE(rb.rab_overhead_budget, 0) + COALESCE(cb.co_overhead_budget, 0)) - COALESCE(foh.actual_overhead_spent, 0)) AS overhead_variance

FROM rab_budget rb
JOIN spk s ON rb.spk_id = s.id
LEFT JOIN co_budget cb ON rb.spk_id = cb.spk_id AND rb.wbs_stage = cb.wbs_stage
LEFT JOIN actual_material am ON rb.spk_id = am.spk_id AND rb.wbs_stage = am.wbs_stage
LEFT JOIN actual_labor al ON rb.spk_id = al.spk_id AND rb.wbs_stage = al.wbs_stage
LEFT JOIN actual_foh foh ON rb.spk_id = foh.spk_id AND rb.wbs_stage = foh.wbs_stage;

GRANT SELECT ON public.view_wbs_cost_variance TO authenticated;

-- 3. Perbarui VIEW Laba Rugi Proyek (Job Profitability 3 Unsur HPP)
DROP VIEW IF EXISTS public.view_spk_job_profitability CASCADE;

CREATE OR REPLACE VIEW public.view_spk_job_profitability AS
WITH spk_revenue AS (
  SELECT 
    spk_id,
    COALESCE(SUM(total_amount), 0) AS total_revenue,
    MAX(payment_status) AS payment_status
  FROM final_billing
  GROUP BY spk_id
),
spk_mat AS (
  SELECT 
    spk_id,
    COALESCE(SUM(quantity * unit_price), 0) AS actual_material_cost
  FROM material_issues
  GROUP BY spk_id
),
spk_lab AS (
  SELECT 
    spk_id,
    COALESCE(SUM(total_amount), 0) AS actual_labor_cost
  FROM spk_borongan
  GROUP BY spk_id
),
spk_foh AS (
  SELECT 
    spk_id,
    COALESCE(SUM(total_amount), 0) AS actual_overhead_cost
  FROM spk_overhead_logs
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
  COALESCE(r.total_revenue, 0) AS total_revenue,
  COALESCE(m.actual_material_cost, 0) AS actual_material_cost,
  COALESCE(l.actual_labor_cost, 0) AS actual_labor_cost,
  COALESCE(f.actual_overhead_cost, 0) AS actual_overhead_cost,
  
  -- HPP Komprehensif = Material + Labor + Overhead
  (COALESCE(m.actual_material_cost, 0) + COALESCE(l.actual_labor_cost, 0) + COALESCE(f.actual_overhead_cost, 0)) AS total_cogs,
  
  -- Gross / Net Operating Profit Proyek
  (COALESCE(r.total_revenue, 0) - (COALESCE(m.actual_material_cost, 0) + COALESCE(l.actual_labor_cost, 0) + COALESCE(f.actual_overhead_cost, 0))) AS gross_profit,
  
  CASE 
    WHEN COALESCE(r.total_revenue, 0) > 0 THEN
      ROUND(((COALESCE(r.total_revenue, 0) - (COALESCE(m.actual_material_cost, 0) + COALESCE(l.actual_labor_cost, 0) + COALESCE(f.actual_overhead_cost, 0))) / r.total_revenue * 100)::numeric, 2)
    ELSE 0
  END AS gross_margin_percentage,
  COALESCE(r.payment_status, 'UNBILLED') AS payment_status

FROM spk s
LEFT JOIN spk_revenue r ON s.id = r.spk_id
LEFT JOIN spk_mat m ON s.id = m.spk_id
LEFT JOIN spk_lab l ON s.id = l.spk_id
LEFT JOIN spk_foh f ON s.id = f.spk_id;

GRANT SELECT ON public.view_spk_job_profitability TO authenticated;

-- 4. Perbarui RPC get_financial_executive_summary
CREATE OR REPLACE FUNCTION get_financial_executive_summary(
  start_date TIMESTAMPTZ DEFAULT NULL,
  end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_summary JSON;
BEGIN
  WITH filtered_spk AS (
    SELECT * FROM view_spk_job_profitability
    WHERE (start_date IS NULL OR registration_date >= start_date)
      AND (end_date IS NULL OR registration_date <= end_date)
  ),
  inventory_stat AS (
    SELECT 
      COALESCE(SUM(total_inventory_valuation_hpp), 0) AS total_inventory_hpp,
      COALESCE(SUM(total_inventory_market_value), 0) AS total_inventory_market
    FROM view_inventory_valuation
  ),
  receivables_stat AS (
    SELECT 
      COALESCE(SUM(outstanding_balance), 0) AS total_outstanding,
      COUNT(CASE WHEN handover_clearance_status = 'UNIT SELESAI (TERTAHAN PELUNASAN)' THEN 1 END) AS pending_handover_count
    FROM view_project_receivables
  )
  SELECT json_build_object(
    'total_projects', COUNT(f.spk_id),
    'total_revenue', COALESCE(SUM(f.total_revenue), 0),
    'total_actual_material_cost', COALESCE(SUM(f.actual_material_cost), 0),
    'total_actual_labor_cost', COALESCE(SUM(f.actual_labor_cost), 0),
    'total_actual_overhead_cost', COALESCE(SUM(f.actual_overhead_cost), 0),
    'total_cogs', COALESCE(SUM(f.total_cogs), 0),
    'total_gross_profit', COALESCE(SUM(f.gross_profit), 0),
    'average_gross_margin', CASE 
      WHEN COALESCE(SUM(f.total_revenue), 0) > 0 THEN 
        ROUND((SUM(f.gross_profit) / SUM(f.total_revenue) * 100)::numeric, 2)
      ELSE 0 
    END,
    'total_inventory_valuation', (SELECT total_inventory_hpp FROM inventory_stat),
    'total_inventory_market_value', (SELECT total_inventory_market FROM inventory_stat),
    'total_outstanding_receivables', (SELECT total_outstanding FROM receivables_stat),
    'units_pending_handover', (SELECT pending_handover_count FROM receivables_stat)
  ) INTO v_summary
  FROM filtered_spk f;

  RETURN v_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_financial_executive_summary TO authenticated;
