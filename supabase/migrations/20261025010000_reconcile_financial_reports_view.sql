-- ==============================================================================
-- MIGRATION: 20261025010000_reconcile_financial_reports_view.sql
-- Description: Reconcile view_spk_job_profitability and get_financial_executive_summary
--              with validated RAB Perubahan and Kasir Billing figures.
--              Includes comprehensive package component HPP (Material, Labor, Overhead)
--              and master package selling price resolution for initial RAB & approved COs.
-- ==============================================================================

-- 1. Drop dependent views first
DROP VIEW IF EXISTS public.view_corporate_monthly_pnl CASCADE;
DROP VIEW IF EXISTS public.view_spk_job_profitability CASCADE;

-- 2. Perbarui View view_spk_job_profitability agar menyerap nilai paket utuh dan biaya total
CREATE OR REPLACE VIEW public.view_spk_job_profitability AS
WITH rab_pkg AS (
  SELECT 
    ri.spk_id,
    ri.package_id,
    COALESCE(MAX(pp.selling_price), SUM(ri.quantity * ri.unit_price)) AS pkg_selling_price,
    SUM(ri.quantity * ri.cost_price) AS pkg_cogs,
    SUM(CASE WHEN ri.item_type = 'MATERIAL' THEN ri.quantity * ri.cost_price ELSE 0 END) AS pkg_mat_cogs,
    SUM(CASE WHEN ri.item_type = 'LABOR' THEN ri.quantity * ri.cost_price ELSE 0 END) AS pkg_labor_cogs,
    SUM(CASE WHEN ri.item_type = 'OVERHEAD' THEN ri.quantity * ri.cost_price ELSE 0 END) AS pkg_foh_cogs
  FROM public.rab_items ri
  LEFT JOIN public.product_packages pp ON ri.package_id = pp.id
  WHERE ri.package_id IS NOT NULL
  GROUP BY ri.spk_id, ri.package_id, COALESCE(ri.package_name, '')
),
co_pkg AS (
  SELECT 
    co.spk_id,
    coi.package_source_id AS package_id,
    COALESCE(MAX(pp.selling_price), SUM(coi.quantity * coi.unit_price)) AS pkg_selling_price,
    SUM(coi.quantity * coi.cost_price) AS pkg_cogs,
    SUM(CASE WHEN coi.item_type = 'MATERIAL' THEN coi.quantity * coi.cost_price ELSE 0 END) AS pkg_mat_cogs,
    SUM(CASE WHEN coi.item_type = 'LABOR' THEN coi.quantity * coi.cost_price ELSE 0 END) AS pkg_labor_cogs,
    SUM(CASE WHEN coi.item_type = 'OVERHEAD' THEN coi.quantity * coi.cost_price ELSE 0 END) AS pkg_foh_cogs
  FROM public.change_order_items coi
  JOIN public.change_orders co ON coi.change_order_id = co.id
  LEFT JOIN public.product_packages pp ON coi.package_source_id = pp.id
  WHERE co.status = 'APPROVED' AND (coi.package_source_id IS NOT NULL OR coi.package_name IS NOT NULL)
  GROUP BY co.spk_id, coi.package_source_id, COALESCE(coi.package_instance_id::text, coi.package_name, '')
),
package_summary AS (
  SELECT 
    spk_id,
    COALESCE(SUM(pkg_selling_price), 0) AS package_revenue,
    COALESCE(SUM(pkg_cogs), 0) AS package_cogs,
    COALESCE(SUM(pkg_mat_cogs), 0) AS pkg_material_cogs,
    COALESCE(SUM(pkg_labor_cogs), 0) AS pkg_labor_cogs,
    COALESCE(SUM(pkg_foh_cogs), 0) AS pkg_foh_cogs
  FROM (
    SELECT * FROM rab_pkg
    UNION ALL
    SELECT * FROM co_pkg
  ) all_pkg
  GROUP BY spk_id
),
granular_items AS (
  SELECT 
    spk_id,
    item_type,
    quantity,
    unit_price,
    cost_price
  FROM public.rab_items
  WHERE package_id IS NULL AND (package_name IS NULL OR package_name = '')
  UNION ALL
  SELECT 
    co.spk_id,
    coi.item_type,
    coi.quantity,
    coi.unit_price,
    coi.cost_price
  FROM public.change_order_items coi
  JOIN public.change_orders co ON coi.change_order_id = co.id
  WHERE co.status = 'APPROVED' AND coi.package_source_id IS NULL AND (coi.package_name IS NULL OR coi.package_name = '')
),
granular_summary AS (
  SELECT 
    spk_id,
    COALESCE(SUM(CASE WHEN item_type = 'MATERIAL' THEN quantity * unit_price ELSE 0 END), 0) AS granular_mat_revenue,
    COALESCE(SUM(CASE WHEN item_type = 'LABOR' THEN quantity * unit_price ELSE 0 END), 0) AS granular_labor_revenue,
    COALESCE(SUM(CASE WHEN item_type = 'OVERHEAD' THEN quantity * unit_price ELSE 0 END), 0) AS granular_foh_revenue,
    COALESCE(SUM(CASE WHEN item_type = 'MATERIAL' THEN quantity * cost_price ELSE 0 END), 0) AS granular_mat_cogs,
    COALESCE(SUM(CASE WHEN item_type = 'LABOR' THEN quantity * cost_price ELSE 0 END), 0) AS granular_labor_cogs,
    COALESCE(SUM(CASE WHEN item_type = 'OVERHEAD' THEN quantity * cost_price ELSE 0 END), 0) AS granular_foh_cogs
  FROM granular_items
  GROUP BY spk_id
)
SELECT 
  s.id AS spk_id,
  s.spk_number,
  s.customer_name,
  s.vehicle_plate,
  s.status::text AS spk_status,
  s.created_at AS registration_date,

  -- Breakdown Komponen & 4 Pilar Profit Segregation
  COALESCE(ps.package_revenue, 0) AS package_revenue,
  COALESCE(ps.package_cogs, 0) AS package_cogs,
  (COALESCE(ps.package_revenue, 0) - COALESCE(ps.package_cogs, 0)) AS package_profit,
  COALESCE(gs.granular_mat_revenue, 0) AS granular_mat_revenue,
  COALESCE(gs.granular_mat_cogs, 0) AS granular_mat_cogs,
  (COALESCE(gs.granular_mat_revenue, 0) - COALESCE(gs.granular_mat_cogs, 0)) AS granular_material_profit,
  COALESCE(gs.granular_labor_revenue, 0) AS granular_labor_revenue,
  COALESCE(gs.granular_labor_cogs, 0) AS granular_labor_cogs,
  (COALESCE(gs.granular_labor_revenue, 0) - COALESCE(gs.granular_labor_cogs, 0)) AS granular_labor_profit,
  COALESCE(gs.granular_foh_revenue, 0) AS granular_foh_revenue,
  COALESCE(gs.granular_foh_cogs, 0) AS granular_foh_cogs,
  (COALESCE(gs.granular_foh_revenue, 0) - COALESCE(gs.granular_foh_cogs, 0)) AS granular_overhead_profit,

  -- 1. Total Omzet / Pendapatan Konsolidasi
  (COALESCE(ps.package_revenue, 0) + COALESCE(gs.granular_mat_revenue, 0) + COALESCE(gs.granular_labor_revenue, 0) + COALESCE(gs.granular_foh_revenue, 0)) AS total_revenue,

  -- 2. HPP per Kategori Komprehensif (Paket + Granular)
  (COALESCE(ps.pkg_material_cogs, 0) + COALESCE(gs.granular_mat_cogs, 0)) AS actual_material_cost,
  (COALESCE(ps.pkg_labor_cogs, 0) + COALESCE(gs.granular_labor_cogs, 0)) AS actual_labor_cost,
  (COALESCE(ps.pkg_foh_cogs, 0) + COALESCE(gs.granular_foh_cogs, 0)) AS actual_overhead_cost,

  -- 3. Total HPP (COGS)
  (COALESCE(ps.package_cogs, 0) + COALESCE(gs.granular_mat_cogs, 0) + COALESCE(gs.granular_labor_cogs, 0) + COALESCE(gs.granular_foh_cogs, 0)) AS total_cogs,

  -- 5. Laba Kotor (Gross Profit) & Persentase
  ((COALESCE(ps.package_revenue, 0) + COALESCE(gs.granular_mat_revenue, 0) + COALESCE(gs.granular_labor_revenue, 0) + COALESCE(gs.granular_foh_revenue, 0)) -
   (COALESCE(ps.package_cogs, 0) + COALESCE(gs.granular_mat_cogs, 0) + COALESCE(gs.granular_labor_cogs, 0) + COALESCE(gs.granular_foh_cogs, 0))) AS gross_profit,

  CASE 
    WHEN (COALESCE(ps.package_revenue, 0) + COALESCE(gs.granular_mat_revenue, 0) + COALESCE(gs.granular_labor_revenue, 0) + COALESCE(gs.granular_foh_revenue, 0)) > 0 THEN
      ROUND((((COALESCE(ps.package_revenue, 0) + COALESCE(gs.granular_mat_revenue, 0) + COALESCE(gs.granular_labor_revenue, 0) + COALESCE(gs.granular_foh_revenue, 0)) -
              (COALESCE(ps.package_cogs, 0) + COALESCE(gs.granular_mat_cogs, 0) + COALESCE(gs.granular_labor_cogs, 0) + COALESCE(gs.granular_foh_cogs, 0))) /
             (COALESCE(ps.package_revenue, 0) + COALESCE(gs.granular_mat_revenue, 0) + COALESCE(gs.granular_labor_revenue, 0) + COALESCE(gs.granular_foh_revenue, 0)) * 100)::numeric, 2)
    ELSE 0
  END AS gross_margin_percentage,

  COALESCE(s.status::text, 'ACTIVE') AS payment_status

FROM public.spk s
LEFT JOIN package_summary ps ON s.id = ps.spk_id
LEFT JOIN granular_summary gs ON s.id = gs.spk_id
WHERE UPPER(s.status::text) NOT IN ('DRAFT', 'PENDING_PAYMENT');

GRANT SELECT ON public.view_spk_job_profitability TO authenticated, anon;

-- 3. Recreate view_corporate_monthly_pnl (depends on view_spk_job_profitability)
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
  COALESCE(m.total_foh_cogs, 0) AS total_foh_cogs,
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

-- 4. Perbarui RPC get_financial_executive_summary mengekstrak langsung dari view_spk_job_profitability
CREATE OR REPLACE FUNCTION public.get_financial_executive_summary(
  start_date TIMESTAMPTZ DEFAULT NULL,
  end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_summary JSON;
BEGIN
  WITH filtered_spk AS (
    SELECT * FROM public.view_spk_job_profitability
    WHERE (start_date IS NULL OR registration_date >= start_date)
      AND (end_date IS NULL OR registration_date <= end_date)
  ),
  inventory_stat AS (
    SELECT 
      COALESCE(SUM(total_inventory_valuation_hpp), 0) AS total_inventory_hpp,
      COALESCE(SUM(total_inventory_market_value), 0) AS total_inventory_market
    FROM public.view_inventory_valuation
  ),
  receivables_stat AS (
    SELECT 
      COALESCE(SUM(outstanding_balance), 0) AS total_outstanding,
      COUNT(CASE WHEN handover_clearance_status = 'UNIT SELESAI (TERTAHAN PELUNASAN)' THEN 1 END) AS pending_handover_count
    FROM public.view_project_receivables
  )
  SELECT json_build_object(
    'total_projects', COALESCE(COUNT(f.spk_id), 0),
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
    'total_inventory_valuation', COALESCE((SELECT total_inventory_hpp FROM inventory_stat), 0),
    'total_inventory_market_value', COALESCE((SELECT total_inventory_market FROM inventory_stat), 0),
    'total_outstanding_receivables', COALESCE((SELECT total_outstanding FROM receivables_stat), 0),
    'units_pending_handover', COALESCE((SELECT pending_handover_count FROM receivables_stat), 0)
  ) INTO v_summary
  FROM filtered_spk f;

  RETURN COALESCE(v_summary, json_build_object(
    'total_projects', 0,
    'total_revenue', 0,
    'total_actual_material_cost', 0,
    'total_actual_labor_cost', 0,
    'total_actual_overhead_cost', 0,
    'total_cogs', 0,
    'total_gross_profit', 0,
    'average_gross_margin', 0,
    'total_inventory_valuation', 0,
    'total_inventory_market_value', 0,
    'total_outstanding_receivables', 0,
    'units_pending_handover', 0
  ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_financial_executive_summary TO authenticated, anon;
