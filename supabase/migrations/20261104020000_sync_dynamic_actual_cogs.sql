-- ==============================================================================
-- MIGRATION: 20261104020000_sync_dynamic_actual_cogs.sql
-- Description: Synchronize Active SPK Monitoring and Financial Reports with Revised Actual HPP from RAB Perubahan.
--              Dynamically incorporates store cost price updates and warehouse material issues into actual COGS.
-- ==============================================================================

-- 1. Ensure material_issues view exposes unit_cost alongside unit_price
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'material_issues') THEN
    CREATE OR REPLACE VIEW public.material_issues AS
    SELECT 
      it.id,
      it.spk_id,
      it.material_id,
      it.quantity_issued AS quantity,
      COALESCE(it.custom_unit_price, m.cost_price, m.unit_price, 0) AS unit_price,
      COALESCE(it.custom_unit_price, m.cost_price, m.unit_price, 0) AS unit_cost,
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
  END IF;
END $$;

-- 2. Drop dependent views first
DROP VIEW IF EXISTS public.view_corporate_monthly_pnl CASCADE;
DROP VIEW IF EXISTS public.view_spk_job_profitability CASCADE;

-- 3. Recreate View view_spk_job_profitability with dynamic actual COGS
CREATE OR REPLACE VIEW public.view_spk_job_profitability AS
WITH all_items AS (
  -- 1. Item dari RAB Awal
  SELECT 
    ri.spk_id,
    ri.package_id,
    ri.item_type,
    ri.quantity,
    ri.unit_price,
    ri.cost_price AS estimated_cost,
    -- Jika material, prioritaskan harga barang keluar (material_issues) atau harga master gudang terkini jika ada kenaikan
    CASE 
      WHEN ri.item_type = 'MATERIAL' AND mi.unit_cost IS NOT NULL THEN mi.unit_cost
      WHEN ri.item_type = 'MATERIAL' AND m.cost_price > ri.cost_price THEN m.cost_price
      ELSE ri.cost_price
    END AS effective_cost
  FROM public.rab_items ri
  LEFT JOIN public.materials m ON ri.material_id = m.id
  LEFT JOIN LATERAL (
    SELECT COALESCE(unit_cost, unit_price) AS unit_cost FROM public.material_issues 
    WHERE spk_id = ri.spk_id AND material_id = ri.material_id 
    ORDER BY created_at DESC LIMIT 1
  ) mi ON true

  UNION ALL

  -- 2. Item dari Approved Change Orders
  SELECT 
    co.spk_id,
    coi.package_source_id AS package_id,
    coi.item_type,
    coi.quantity,
    coi.unit_price,
    coi.cost_price AS estimated_cost,
    CASE 
      WHEN coi.item_type = 'MATERIAL' AND mi.unit_cost IS NOT NULL THEN mi.unit_cost
      WHEN coi.item_type = 'MATERIAL' AND m.cost_price > coi.cost_price THEN m.cost_price
      ELSE coi.cost_price
    END AS effective_cost
  FROM public.change_order_items coi
  JOIN public.change_orders co ON coi.change_order_id = co.id
  LEFT JOIN public.materials m ON coi.material_id = m.id
  LEFT JOIN LATERAL (
    SELECT COALESCE(unit_cost, unit_price) AS unit_cost FROM public.material_issues 
    WHERE spk_id = co.spk_id AND material_id = coi.material_id 
    ORDER BY created_at DESC LIMIT 1
  ) mi ON true
  WHERE co.status = 'APPROVED'
),
spk_summary AS (
  SELECT 
    spk_id,
    COALESCE(SUM(quantity * unit_price), 0) AS total_revenue,
    COALESCE(SUM(quantity * estimated_cost), 0) AS initial_cogs,
    COALESCE(SUM(quantity * effective_cost), 0) AS actual_cogs,
    COALESCE(SUM(CASE WHEN item_type = 'MATERIAL' THEN quantity * effective_cost ELSE 0 END), 0) AS actual_material_cost,
    COALESCE(SUM(CASE WHEN item_type = 'LABOR' THEN quantity * effective_cost ELSE 0 END), 0) AS actual_labor_cost,
    COALESCE(SUM(CASE WHEN item_type = 'OVERHEAD' THEN quantity * effective_cost ELSE 0 END), 0) AS actual_overhead_cost,
    COALESCE(SUM(CASE WHEN package_id IS NOT NULL THEN quantity * unit_price ELSE 0 END), 0) AS package_revenue,
    COALESCE(SUM(CASE WHEN package_id IS NOT NULL THEN quantity * effective_cost ELSE 0 END), 0) AS package_cogs,
    COALESCE(SUM(CASE WHEN package_id IS NULL AND item_type = 'MATERIAL' THEN quantity * unit_price ELSE 0 END), 0) AS granular_mat_revenue,
    COALESCE(SUM(CASE WHEN package_id IS NULL AND item_type = 'MATERIAL' THEN quantity * effective_cost ELSE 0 END), 0) AS granular_mat_cogs,
    COALESCE(SUM(CASE WHEN package_id IS NULL AND item_type = 'LABOR' THEN quantity * unit_price ELSE 0 END), 0) AS granular_labor_revenue,
    COALESCE(SUM(CASE WHEN package_id IS NULL AND item_type = 'LABOR' THEN quantity * effective_cost ELSE 0 END), 0) AS granular_labor_cogs,
    COALESCE(SUM(CASE WHEN package_id IS NULL AND item_type = 'OVERHEAD' THEN quantity * unit_price ELSE 0 END), 0) AS granular_foh_revenue,
    COALESCE(SUM(CASE WHEN package_id IS NULL AND item_type = 'OVERHEAD' THEN quantity * effective_cost ELSE 0 END), 0) AS granular_foh_cogs
  FROM all_items
  GROUP BY spk_id
)
SELECT 
  s.id AS spk_id,
  COALESCE(s.spk_number, s.spk_no) AS spk_number,
  s.customer_name,
  s.vehicle_plate,
  s.status::text AS spk_status,
  s.created_at AS registration_date,
  COALESCE(s.status::text, 'ACTIVE') AS payment_status,
  s.is_profit_locked,
  s.bast_date,

  -- Breakdown Komponen & 4 Pilar Profit Segregation
  COALESCE(sm.package_revenue, 0) AS package_revenue,
  COALESCE(sm.package_cogs, 0) AS package_cogs,
  (COALESCE(sm.package_revenue, 0) - COALESCE(sm.package_cogs, 0)) AS package_profit,
  COALESCE(sm.granular_mat_revenue, 0) AS granular_mat_revenue,
  COALESCE(sm.granular_mat_cogs, 0) AS granular_mat_cogs,
  (COALESCE(sm.granular_mat_revenue, 0) - COALESCE(sm.granular_mat_cogs, 0)) AS granular_material_profit,
  COALESCE(sm.granular_labor_revenue, 0) AS granular_labor_revenue,
  COALESCE(sm.granular_labor_cogs, 0) AS granular_labor_cogs,
  (COALESCE(sm.granular_labor_revenue, 0) - COALESCE(sm.granular_labor_cogs, 0)) AS granular_labor_profit,
  COALESCE(sm.granular_foh_revenue, 0) AS granular_foh_revenue,
  COALESCE(sm.granular_foh_cogs, 0) AS granular_foh_cogs,
  (COALESCE(sm.granular_foh_revenue, 0) - COALESCE(sm.granular_foh_cogs, 0)) AS granular_overhead_profit,

  -- Pendapatan (Omzet)
  CASE 
    WHEN s.is_profit_locked = TRUE AND s.locked_revenue IS NOT NULL THEN s.locked_revenue
    ELSE COALESCE(sm.total_revenue, 0)
  END AS total_revenue,

  -- HPP Komponen
  COALESCE(sm.actual_material_cost, 0) AS actual_material_cost,
  COALESCE(sm.actual_labor_cost, 0) AS actual_labor_cost,
  COALESCE(sm.actual_overhead_cost, 0) AS actual_overhead_cost,

  -- HPP Modal Awal
  COALESCE(sm.initial_cogs, 0) AS initial_cogs,

  -- HPP Modal Aktual (Menyerap Kenaikan Belanja)
  CASE 
    WHEN s.is_profit_locked = TRUE AND s.locked_cogs IS NOT NULL THEN s.locked_cogs
    ELSE COALESCE(sm.actual_cogs, 0)
  END AS total_cogs,

  -- Laba Bersih Operasional Proyek
  CASE 
    WHEN s.is_profit_locked = TRUE AND s.locked_profit IS NOT NULL THEN s.locked_profit
    ELSE (COALESCE(sm.total_revenue, 0) - COALESCE(sm.actual_cogs, 0))
  END AS gross_profit,

  -- Persentase Margin
  CASE 
    WHEN s.is_profit_locked = TRUE AND s.locked_margin_pct IS NOT NULL THEN s.locked_margin_pct
    WHEN COALESCE(sm.total_revenue, 0) > 0 THEN 
      ROUND(((COALESCE(sm.total_revenue, 0) - COALESCE(sm.actual_cogs, 0)) / COALESCE(sm.total_revenue, 0) * 100)::numeric, 2)
    ELSE 0
  END AS gross_margin_percentage,

  -- Snapshot locked fields
  s.locked_revenue,
  s.locked_cogs,
  s.locked_profit,
  s.locked_margin_pct,
  s.final_revenue,
  s.final_cogs,
  s.final_profit

FROM public.spk s
LEFT JOIN spk_summary sm ON s.id = sm.spk_id
WHERE UPPER(s.status::text) NOT IN ('DRAFT', 'PENDING_PAYMENT');

GRANT SELECT ON public.view_spk_job_profitability TO authenticated, anon;

-- 4. Recreate view_corporate_monthly_pnl (depends on view_spk_job_profitability)
CREATE OR REPLACE VIEW public.view_corporate_monthly_pnl AS
WITH monthly_revenue_cogs AS (
  SELECT 
    DATE_TRUNC('month', registration_date)::date AS report_month,
    COUNT(spk_id) AS total_spk_count,
    COALESCE(SUM(total_revenue), 0) AS total_revenue,
    COALESCE(SUM(actual_material_cost), 0) AS total_material_cogs,
    COALESCE(SUM(actual_labor_cost), 0) AS total_labor_cogs,
    COALESCE(SUM(actual_overhead_cost), 0) AS total_foh_cogs,
    COALESCE(SUM(total_cogs), 0) AS total_cogs,
    COALESCE(SUM(gross_profit), 0) AS gross_profit
  FROM public.view_spk_job_profitability
  GROUP BY DATE_TRUNC('month', registration_date)::date
),
monthly_opex AS (
  SELECT 
    effective_month AS report_month,
    COALESCE(SUM(amount), 0) AS total_opex,
    COALESCE(SUM(CASE WHEN category_name ILIKE '%gaji%' THEN amount ELSE 0 END), 0) AS opex_salary,
    COALESCE(SUM(CASE WHEN category_name ILIKE '%listrik%' OR category_name ILIKE '%utilitas%' THEN amount ELSE 0 END), 0) AS opex_utility,
    COALESCE(SUM(CASE WHEN category_name ILIKE '%sewa%' THEN amount ELSE 0 END), 0) AS opex_rent,
    COALESCE(SUM(CASE WHEN category_name ILIKE '%kebersihan%' OR category_name ILIKE '%amenities%' THEN amount ELSE 0 END), 0) AS opex_amenities,
    COALESCE(SUM(CASE WHEN category_name NOT ILIKE '%gaji%' AND category_name NOT ILIKE '%listrik%' AND category_name NOT ILIKE '%sewa%' AND category_name NOT ILIKE '%kebersihan%' THEN amount ELSE 0 END), 0) AS opex_others
  FROM public.operating_expenses
  GROUP BY effective_month
)
SELECT 
  COALESCE(m.report_month, o.report_month) AS report_month,
  COALESCE(m.total_spk_count, 0) AS total_spk_count,
  COALESCE(m.total_revenue, 0) AS total_revenue,
  COALESCE(m.total_material_cogs, 0) AS total_material_cogs,
  COALESCE(m.total_labor_cogs, 0) AS total_labor_cogs,
  COALESCE(m.total_overhead_cost, 0) AS total_foh_cogs,
  COALESCE(m.total_cogs, 0) AS total_cogs,
  COALESCE(m.gross_profit, 0) AS gross_profit,
  COALESCE(o.total_opex, 0) AS total_opex,
  (COALESCE(m.gross_profit, 0) - COALESCE(o.total_opex, 0)) AS net_operating_profit,
  CASE 
    WHEN COALESCE(m.total_revenue, 0) > 0 THEN 
      ROUND(((COALESCE(m.gross_profit, 0) - COALESCE(o.total_opex, 0)) / m.total_revenue * 100)::numeric, 2)
    ELSE 0 
  END AS net_profit_margin_percentage
FROM monthly_revenue_cogs m
FULL OUTER JOIN monthly_opex o ON m.report_month = o.report_month
ORDER BY report_month DESC;

GRANT SELECT ON public.view_corporate_monthly_pnl TO authenticated, anon;

