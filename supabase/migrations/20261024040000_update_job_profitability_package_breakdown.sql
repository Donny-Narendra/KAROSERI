-- ==============================================================================
-- MIGRATION: 20261024040000_update_job_profitability_package_breakdown.sql
-- Description: Update view_spk_job_profitability to strictly isolate package vs
--              non-package granular (material, labor, overhead) values.
-- ==============================================================================

DROP VIEW IF EXISTS public.view_corporate_monthly_pnl CASCADE;
DROP VIEW IF EXISTS public.view_spk_job_profitability CASCADE;

CREATE OR REPLACE VIEW public.view_spk_job_profitability AS
WITH all_items AS (
  SELECT 
    spk_id,
    package_id,
    item_type,
    quantity,
    unit_price,
    cost_price
  FROM public.rab_items
  UNION ALL
  SELECT 
    co.spk_id,
    coi.package_source_id AS package_id,
    coi.item_type,
    coi.quantity,
    coi.unit_price,
    coi.cost_price
  FROM public.change_order_items coi
  JOIN public.change_orders co ON coi.change_order_id = co.id
  WHERE co.status = 'APPROVED'
),
summary AS (
  SELECT 
    spk_id,
    -- Omzet & Biaya Paket
    COALESCE(SUM(CASE WHEN package_id IS NOT NULL THEN quantity * unit_price ELSE 0 END), 0) AS package_revenue,
    COALESCE(SUM(CASE WHEN package_id IS NOT NULL THEN quantity * cost_price ELSE 0 END), 0) AS package_cogs,
    -- Omzet & Biaya Granular
    COALESCE(SUM(CASE WHEN package_id IS NULL AND item_type = 'MATERIAL' THEN quantity * unit_price ELSE 0 END), 0) AS granular_mat_revenue,
    COALESCE(SUM(CASE WHEN package_id IS NULL AND item_type = 'MATERIAL' THEN quantity * cost_price ELSE 0 END), 0) AS granular_mat_cogs,
    COALESCE(SUM(CASE WHEN package_id IS NULL AND item_type = 'LABOR' THEN quantity * unit_price ELSE 0 END), 0) AS granular_labor_revenue,
    COALESCE(SUM(CASE WHEN package_id IS NULL AND item_type = 'LABOR' THEN quantity * cost_price ELSE 0 END), 0) AS granular_labor_cogs,
    COALESCE(SUM(CASE WHEN package_id IS NULL AND item_type = 'OVERHEAD' THEN quantity * unit_price ELSE 0 END), 0) AS granular_foh_revenue,
    COALESCE(SUM(CASE WHEN package_id IS NULL AND item_type = 'OVERHEAD' THEN quantity * cost_price ELSE 0 END), 0) AS granular_foh_cogs
  FROM all_items
  GROUP BY spk_id
)
SELECT 
  s.id AS spk_id,
  s.spk_number,
  s.customer_name,
  s.vehicle_plate,
  s.status AS spk_status,
  s.created_at AS registration_date,
  -- Paket
  sm.package_revenue,
  sm.package_cogs,
  (sm.package_revenue - sm.package_cogs) AS package_profit,
  -- Granular Material
  sm.granular_mat_revenue,
  sm.granular_mat_cogs,
  (sm.granular_mat_revenue - sm.granular_mat_cogs) AS granular_material_profit,
  -- Granular Labor
  sm.granular_labor_revenue,
  sm.granular_labor_cogs,
  (sm.granular_labor_revenue - sm.granular_labor_cogs) AS granular_labor_profit,
  -- Granular Overhead
  sm.granular_foh_revenue,
  sm.granular_foh_cogs,
  (sm.granular_foh_revenue - sm.granular_foh_cogs) AS granular_overhead_profit,
  -- Totals
  (sm.package_revenue + sm.granular_mat_revenue + sm.granular_labor_revenue + sm.granular_foh_revenue) AS total_revenue,
  (sm.package_cogs + sm.granular_mat_cogs + sm.granular_labor_cogs + sm.granular_foh_cogs) AS total_cogs,
  ((sm.package_revenue + sm.granular_mat_revenue + sm.granular_labor_revenue + sm.granular_foh_revenue) - 
   (sm.package_cogs + sm.granular_mat_cogs + sm.granular_labor_cogs + sm.granular_foh_cogs)) AS gross_profit
FROM public.spk s
LEFT JOIN summary sm ON s.id = sm.spk_id;

GRANT SELECT ON public.view_spk_job_profitability TO authenticated, anon;

-- Recreate view_corporate_monthly_pnl (which depends on view_spk_job_profitability)
CREATE VIEW public.view_corporate_monthly_pnl AS
WITH monthly_revenue_cogs AS (
  SELECT 
    DATE_TRUNC('month', registration_date)::date AS report_month,
    COUNT(spk_id) AS total_spk_count,
    COALESCE(SUM(total_revenue), 0) AS total_revenue,
    COALESCE(SUM(granular_mat_cogs), 0) AS total_material_cogs,
    COALESCE(SUM(granular_labor_cogs), 0) AS total_labor_cogs,
    COALESCE(SUM(granular_foh_cogs), 0) AS total_foh_cogs,
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
  END AS net_margin_percentage,
  -- Breakdown OPEX
  COALESCE(o.opex_salary, 0) AS opex_salary,
  COALESCE(o.opex_utility, 0) AS opex_utility,
  COALESCE(o.opex_rent, 0) AS opex_rent,
  COALESCE(o.opex_amenities, 0) AS opex_amenities,
  COALESCE(o.opex_others, 0) AS opex_others
FROM monthly_revenue_cogs m
FULL OUTER JOIN monthly_opex o ON m.report_month = o.report_month;

GRANT SELECT ON public.view_corporate_monthly_pnl TO authenticated, anon;
