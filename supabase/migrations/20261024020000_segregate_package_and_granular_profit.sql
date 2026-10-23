-- ==============================================================================
-- MIGRATION: 20261024020000_segregate_package_and_granular_profit.sql
-- Description: Comprehensive Profit Segregation (Assembly Package vs Granular Items)
--              across initial RAB items and approved Change Orders.
-- 1. Drops dependent view view_corporate_monthly_pnl and view_spk_job_profitability.
-- 2. Recreates view_spk_job_profitability with 3-pillar profit segregation:
--    - Finished Goods Assembly Package Profit (BOM)
--    - Granular Raw Material Markup Profit
--    - Granular Labor & Overhead Profit
--    combining rab_items and approved change_order_items.
-- 3. Recreates view_corporate_monthly_pnl.
-- ==============================================================================

DROP VIEW IF EXISTS public.view_corporate_monthly_pnl CASCADE;
DROP VIEW IF EXISTS public.view_spk_job_profitability CASCADE;

CREATE VIEW public.view_spk_job_profitability AS
WITH all_project_items AS (
  -- Sumber 1: Estimasi Kontrak Awal (RAB)
  SELECT 
    spk_id,
    package_id,
    item_type,
    quantity,
    unit_price,
    cost_price
  FROM public.rab_items
  
  UNION ALL
  
  -- Sumber 2: Amandemen Tambahan (Approved Change Orders)
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
classified_profit AS (
  SELECT 
    spk_id,
    -- 1. Pilar Pendapatan (Revenue)
    COALESCE(SUM(CASE WHEN package_id IS NOT NULL THEN quantity * unit_price ELSE 0 END), 0) AS package_revenue,
    COALESCE(SUM(CASE WHEN package_id IS NULL AND item_type = 'MATERIAL' THEN quantity * unit_price ELSE 0 END), 0) AS granular_mat_revenue,
    COALESCE(SUM(CASE WHEN package_id IS NULL AND item_type != 'MATERIAL' THEN quantity * unit_price ELSE 0 END), 0) AS granular_other_revenue,

    -- 2. Pilar Beban Pokok (HPP / COGS)
    COALESCE(SUM(CASE WHEN package_id IS NOT NULL THEN quantity * cost_price ELSE 0 END), 0) AS package_cogs,
    COALESCE(SUM(CASE WHEN package_id IS NULL AND item_type = 'MATERIAL' THEN quantity * cost_price ELSE 0 END), 0) AS granular_mat_cogs,
    COALESCE(SUM(CASE WHEN package_id IS NULL AND item_type != 'MATERIAL' THEN quantity * cost_price ELSE 0 END), 0) AS granular_other_cogs
  FROM all_project_items
  GROUP BY spk_id
),
spk_billing AS (
  SELECT 
    spk_id,
    MAX(payment_status) AS payment_status
  FROM public.final_billing
  GROUP BY spk_id
)
SELECT 
  s.id AS spk_id,
  s.spk_number,
  s.customer_name,
  s.customer_phone,
  s.vehicle_plate,
  s.status::text AS spk_status,
  s.created_at AS registration_date,
  s.target_date,
  
  -- Profit Paket Barang Jadi (Assembly)
  COALESCE(cp.package_revenue, 0) AS package_revenue,
  COALESCE(cp.package_cogs, 0) AS package_cogs,
  (COALESCE(cp.package_revenue, 0) - COALESCE(cp.package_cogs, 0)) AS package_profit,
  
  -- Profit Material Granular
  COALESCE(cp.granular_mat_revenue, 0) AS granular_mat_revenue,
  COALESCE(cp.granular_mat_cogs, 0) AS granular_mat_cogs,
  (COALESCE(cp.granular_mat_revenue, 0) - COALESCE(cp.granular_mat_cogs, 0)) AS granular_material_profit,

  -- Profit Jasa & Overhead Lepas
  COALESCE(cp.granular_other_revenue, 0) AS granular_other_revenue,
  COALESCE(cp.granular_other_cogs, 0) AS granular_other_cogs,
  (COALESCE(cp.granular_other_revenue, 0) - COALESCE(cp.granular_other_cogs, 0)) AS granular_other_profit,

  -- Total Finansial Akumulatif
  (COALESCE(cp.package_revenue, 0) + COALESCE(cp.granular_mat_revenue, 0) + COALESCE(cp.granular_other_revenue, 0)) AS total_revenue,
  (COALESCE(cp.package_cogs, 0) + COALESCE(cp.granular_mat_cogs, 0) + COALESCE(cp.granular_other_cogs, 0)) AS total_cogs,
  ((COALESCE(cp.package_revenue, 0) + COALESCE(cp.granular_mat_revenue, 0) + COALESCE(cp.granular_other_revenue, 0)) - 
   (COALESCE(cp.package_cogs, 0) + COALESCE(cp.granular_mat_cogs, 0) + COALESCE(cp.granular_other_cogs, 0))) AS gross_profit,
   
  CASE 
    WHEN (COALESCE(cp.package_revenue, 0) + COALESCE(cp.granular_mat_revenue, 0) + COALESCE(cp.granular_other_revenue, 0)) > 0 THEN
      ROUND((((COALESCE(cp.package_revenue, 0) + COALESCE(cp.granular_mat_revenue, 0) + COALESCE(cp.granular_other_revenue, 0)) - 
              (COALESCE(cp.package_cogs, 0) + COALESCE(cp.granular_mat_cogs, 0) + COALESCE(cp.granular_other_cogs, 0))) / 
             (COALESCE(cp.package_revenue, 0) + COALESCE(cp.granular_mat_revenue, 0) + COALESCE(cp.granular_other_revenue, 0)) * 100)::numeric, 2)
    ELSE 0
  END AS gross_margin_percentage,

  -- Backward-compatibility & status fields for downstream reporting & RPC
  COALESCE(sb.payment_status, 'UNBILLED') AS payment_status,
  COALESCE(cp.granular_mat_cogs, 0) AS actual_material_cost,
  COALESCE(cp.granular_other_cogs, 0) AS actual_labor_cost,
  0::numeric AS actual_overhead_cost

FROM public.spk s
LEFT JOIN classified_profit cp ON s.id = cp.spk_id
LEFT JOIN spk_billing sb ON s.id = sb.spk_id
WHERE UPPER(s.status::text) NOT IN ('DRAFT', 'PENDING_PAYMENT');

GRANT SELECT ON public.view_spk_job_profitability TO authenticated;

-- Recreate view_corporate_monthly_pnl (which depends on view_spk_job_profitability)
CREATE VIEW public.view_corporate_monthly_pnl AS
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
