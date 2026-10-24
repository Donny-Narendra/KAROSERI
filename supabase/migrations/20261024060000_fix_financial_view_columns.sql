-- ==============================================================================
-- MIGRATION: 20261024060000_fix_financial_view_columns.sql
-- Description: Restore backward-compatible aliases (actual_material_cost,
--              actual_labor_cost, actual_overhead_cost, gross_margin_percentage)
--              in view_spk_job_profitability and update RPCs for safe null handling.
-- ==============================================================================

-- 1. Drop dependent views first
DROP VIEW IF EXISTS public.view_corporate_monthly_pnl CASCADE;
DROP VIEW IF EXISTS public.view_spk_job_profitability CASCADE;

-- 2. Perbarui view_spk_job_profitability dengan menyertakan alias backward-compatible
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
  s.status::text AS spk_status,
  s.created_at AS registration_date,
  
  -- Breakdown Komponen
  sm.package_revenue,
  sm.package_cogs,
  (sm.package_revenue - sm.package_cogs) AS package_profit,
  sm.granular_mat_revenue,
  sm.granular_mat_cogs,
  (sm.granular_mat_revenue - sm.granular_mat_cogs) AS granular_material_profit,
  sm.granular_labor_revenue,
  sm.granular_labor_cogs,
  (sm.granular_labor_revenue - sm.granular_labor_cogs) AS granular_labor_profit,
  sm.granular_foh_revenue,
  sm.granular_foh_cogs,
  (sm.granular_foh_revenue - sm.granular_foh_cogs) AS granular_overhead_profit,
  
  -- Kolom Backward Compatibility untuk RPC & Audit
  COALESCE(sm.granular_mat_cogs, 0) AS actual_material_cost,
  COALESCE(sm.granular_labor_cogs, 0) AS actual_labor_cost,
  COALESCE(sm.granular_foh_cogs, 0) AS actual_overhead_cost,

  -- Totals & Profit
  (COALESCE(sm.package_revenue, 0) + COALESCE(sm.granular_mat_revenue, 0) + COALESCE(sm.granular_labor_revenue, 0) + COALESCE(sm.granular_foh_revenue, 0)) AS total_revenue,
  (COALESCE(sm.package_cogs, 0) + COALESCE(sm.granular_mat_cogs, 0) + COALESCE(sm.granular_labor_cogs, 0) + COALESCE(sm.granular_foh_cogs, 0)) AS total_cogs,
  ((COALESCE(sm.package_revenue, 0) + COALESCE(sm.granular_mat_revenue, 0) + COALESCE(sm.granular_labor_revenue, 0) + COALESCE(sm.granular_foh_revenue, 0)) - 
   (COALESCE(sm.package_cogs, 0) + COALESCE(sm.granular_mat_cogs, 0) + COALESCE(sm.granular_labor_cogs, 0) + COALESCE(sm.granular_foh_cogs, 0))) AS gross_profit,
   
  -- Kolom gross_margin_percentage yang dibutuhkan Audit
  CASE 
    WHEN (COALESCE(sm.package_revenue, 0) + COALESCE(sm.granular_mat_revenue, 0) + COALESCE(sm.granular_labor_revenue, 0) + COALESCE(sm.granular_foh_revenue, 0)) > 0 THEN
      ROUND((((COALESCE(sm.package_revenue, 0) + COALESCE(sm.granular_mat_revenue, 0) + COALESCE(sm.granular_labor_revenue, 0) + COALESCE(sm.granular_foh_revenue, 0)) - 
              (COALESCE(sm.package_cogs, 0) + COALESCE(sm.granular_mat_cogs, 0) + COALESCE(sm.granular_labor_cogs, 0) + COALESCE(sm.granular_foh_cogs, 0))) / 
             (COALESCE(sm.package_revenue, 0) + COALESCE(sm.granular_mat_revenue, 0) + COALESCE(sm.granular_labor_revenue, 0) + COALESCE(sm.granular_foh_revenue, 0)) * 100)::numeric, 2)
    ELSE 0
  END AS gross_margin_percentage

FROM public.spk s
LEFT JOIN summary sm ON s.id = sm.spk_id
WHERE UPPER(s.status::text) NOT IN ('DRAFT', 'PENDING_PAYMENT');

GRANT SELECT ON public.view_spk_job_profitability TO authenticated, anon;

-- 3. Recreate view_corporate_monthly_pnl (depends on view_spk_job_profitability)
CREATE OR REPLACE VIEW public.view_corporate_monthly_pnl AS
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
  END AS net_profit_margin_percentage
FROM monthly_revenue_cogs m
FULL OUTER JOIN monthly_opex o ON m.report_month = o.report_month
ORDER BY report_month DESC;

GRANT SELECT ON public.view_corporate_monthly_pnl TO authenticated, anon;

-- 4. Perbarui RPC get_financial_executive_summary agar aman saat data SPK masih kosong
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

-- 5. Recreate RPC audit_financial_sanity_check with safe fallbacks
CREATE OR REPLACE FUNCTION public.audit_financial_sanity_check()
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  WITH over_budget_spk AS (
    SELECT 
      spk_id,
      spk_number,
      customer_name,
      wbs_stage,
      total_material_budget,
      actual_material_spent,
      (actual_material_spent - total_material_budget) AS overspend_amount
    FROM public.view_wbs_cost_variance
    WHERE actual_material_spent > total_material_budget
  ),
  negative_margin_spk AS (
    SELECT 
      spk_id,
      spk_number,
      customer_name,
      total_revenue,
      total_cogs,
      gross_profit,
      gross_margin_percentage
    FROM public.view_spk_job_profitability
    WHERE total_revenue > 0 AND gross_profit < 0
  ),
  unbilled_completed_spk AS (
    SELECT 
      s.id AS spk_id,
      s.spk_number,
      s.customer_name,
      s.vehicle_plate
    FROM public.spk s
    WHERE s.qc_status = 'PASS'
      AND NOT EXISTS (SELECT 1 FROM public.final_billing b WHERE b.spk_id = s.id)
  ),
  unpaid_handover_risks AS (
    SELECT 
      spk_id,
      spk_number,
      customer_name,
      outstanding_balance,
      receivable_aging_days
    FROM public.view_project_receivables
    WHERE handover_clearance_status = 'UNIT SELESAI (TERTAHAN PELUNASAN)'
      AND receivable_aging_days > 7
  )
  SELECT json_build_object(
    'is_healthy', (
      (SELECT COUNT(*) FROM over_budget_spk) = 0 AND 
      (SELECT COUNT(*) FROM negative_margin_spk) = 0 AND 
      (SELECT COUNT(*) FROM unbilled_completed_spk) = 0 AND
      (SELECT COUNT(*) FROM unpaid_handover_risks) = 0
    ),
    'over_budget_count', COALESCE((SELECT COUNT(*) FROM over_budget_spk), 0),
    'over_budget_items', COALESCE((SELECT json_agg(over_budget_spk) FROM over_budget_spk), '[]'::json),
    'negative_margin_count', COALESCE((SELECT COUNT(*) FROM negative_margin_spk), 0),
    'negative_margin_items', COALESCE((SELECT json_agg(negative_margin_spk) FROM negative_margin_spk), '[]'::json),
    'unbilled_completed_count', COALESCE((SELECT COUNT(*) FROM unbilled_completed_spk), 0),
    'unbilled_completed_items', COALESCE((SELECT json_agg(unbilled_completed_spk) FROM unbilled_completed_spk), '[]'::json),
    'critical_receivables_count', COALESCE((SELECT COUNT(*) FROM unpaid_handover_risks), 0),
    'critical_receivables_items', COALESCE((SELECT json_agg(unpaid_handover_risks) FROM unpaid_handover_risks), '[]'::json)
  ) INTO v_result;

  RETURN COALESCE(v_result, json_build_object(
    'is_healthy', true,
    'over_budget_count', 0,
    'over_budget_items', '[]'::json,
    'negative_margin_count', 0,
    'negative_margin_items', '[]'::json,
    'unbilled_completed_count', 0,
    'unbilled_completed_items', '[]'::json,
    'critical_receivables_count', 0,
    'critical_receivables_items', '[]'::json
  ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.audit_financial_sanity_check TO authenticated, anon;
