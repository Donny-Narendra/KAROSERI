-- ==============================================================================
-- MIGRATION: 20261021010000_exclude_draft_spk_from_financial_reports.sql
-- Description: Exclude DRAFT & PENDING_DP Status SPK from Financial Reports & Executive Profitability Views
-- 1. Update public.view_spk_job_profitability (Excludes DRAFT & PENDING_DP)
-- 2. Update public.view_wbs_cost_variance (Excludes DRAFT & PENDING_DP, preserves 3-element approved CO budget)
-- 3. Update RPC public.get_financial_executive_summary (Excludes DRAFT & PENDING_DP from KPI calculations)
-- ==============================================================================

-- 1. Perbarui VIEW view_spk_job_profitability (Eksklusif SPK Non-Draft)
CREATE OR REPLACE VIEW public.view_spk_job_profitability AS
WITH spk_revenue AS (
  SELECT 
    spk_id,
    COALESCE(SUM(total_amount), 0) AS total_revenue,
    MAX(payment_status) AS payment_status
  FROM public.final_billing
  GROUP BY spk_id
),
spk_mat AS (
  SELECT 
    spk_id,
    COALESCE(SUM(quantity * unit_price), 0) AS actual_material_cost
  FROM public.material_issues
  GROUP BY spk_id
),
spk_lab AS (
  SELECT 
    spk_id,
    COALESCE(SUM(total_amount), 0) AS actual_labor_cost
  FROM public.spk_borongan
  WHERE status != 'CANCELLED'
  GROUP BY spk_id
),
spk_foh AS (
  SELECT 
    spk_id,
    COALESCE(SUM(total_amount), 0) AS actual_overhead_cost
  FROM public.spk_overhead_logs
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
  
  -- Gross Profit Proyek = Total Revenue - Total COGS
  (COALESCE(r.total_revenue, 0) - (COALESCE(m.actual_material_cost, 0) + COALESCE(l.actual_labor_cost, 0) + COALESCE(f.actual_overhead_cost, 0))) AS gross_profit,
  
  CASE 
    WHEN COALESCE(r.total_revenue, 0) > 0 THEN
      ROUND(((COALESCE(r.total_revenue, 0) - (COALESCE(m.actual_material_cost, 0) + COALESCE(l.actual_labor_cost, 0) + COALESCE(f.actual_overhead_cost, 0))) / r.total_revenue * 100)::numeric, 2)
    ELSE 0
  END AS gross_margin_percentage,
  COALESCE(r.payment_status, 'UNBILLED') AS payment_status

FROM public.spk s
LEFT JOIN spk_revenue r ON s.id = r.spk_id
LEFT JOIN spk_mat m ON s.id = m.spk_id
LEFT JOIN spk_lab l ON s.id = l.spk_id
LEFT JOIN spk_foh f ON s.id = f.spk_id
-- SYARAT MUTLAK: Kecualikan status DRAFT & PENDING_DP
WHERE UPPER(s.status::text) NOT IN ('DRAFT', 'PENDING_DP');

GRANT SELECT ON public.view_spk_job_profitability TO authenticated;

-- 2. Perbarui VIEW view_wbs_cost_variance agar tidak memuat WBS dari SPK draft / pending DP
CREATE OR REPLACE VIEW public.view_wbs_cost_variance AS
WITH rab_budget AS (
  SELECT 
    spk_id,
    wbs_stage,
    COALESCE(SUM(CASE WHEN item_type = 'MATERIAL' OR item_type IS NULL THEN COALESCE(item_total, quantity * unit_price) ELSE 0 END), 0) AS rab_material_budget,
    COALESCE(SUM(CASE WHEN item_type = 'LABOR' THEN COALESCE(item_total, quantity * unit_price) ELSE 0 END), 0) AS rab_labor_budget,
    COALESCE(SUM(CASE WHEN item_type = 'OVERHEAD' THEN COALESCE(item_total, quantity * unit_price) ELSE 0 END), 0) AS rab_overhead_budget
  FROM public.rab_items
  GROUP BY spk_id, wbs_stage
),
co_budget AS (
  SELECT 
    coi.spk_id,
    coi.wbs_stage,
    COALESCE(SUM(CASE WHEN coi.item_type = 'MATERIAL' OR coi.item_type IS NULL THEN COALESCE(coi.subtotal, coi.quantity * coi.unit_price) ELSE 0 END), 0) AS co_material_budget,
    COALESCE(SUM(CASE WHEN coi.item_type = 'LABOR' THEN COALESCE(coi.subtotal, coi.quantity * coi.unit_price) ELSE 0 END), 0) AS co_labor_budget,
    COALESCE(SUM(CASE WHEN coi.item_type = 'OVERHEAD' THEN COALESCE(coi.subtotal, coi.quantity * coi.unit_price) ELSE 0 END), 0) AS co_overhead_budget
  FROM public.change_order_items coi
  JOIN public.change_orders co ON coi.change_order_id = co.id
  WHERE co.status = 'APPROVED'
  GROUP BY coi.spk_id, coi.wbs_stage
),
actual_material AS (
  SELECT 
    spk_id,
    wbs_stage,
    COALESCE(SUM(quantity * unit_price), 0) AS actual_material_spent
  FROM public.material_issues
  GROUP BY spk_id, wbs_stage
),
actual_labor AS (
  SELECT 
    spk_id,
    wbs_stage,
    COALESCE(SUM(total_amount), 0) AS actual_labor_spent
  FROM public.spk_borongan
  WHERE status != 'CANCELLED'
  GROUP BY spk_id, wbs_stage
),
actual_foh AS (
  SELECT 
    spk_id,
    wbs_stage,
    COALESCE(SUM(total_amount), 0) AS actual_overhead_spent
  FROM public.spk_overhead_logs
  GROUP BY spk_id, wbs_stage
),
stages AS (
  SELECT spk_id, wbs_stage FROM rab_budget
  UNION
  SELECT spk_id, wbs_stage FROM co_budget
  UNION
  SELECT spk_id, wbs_stage FROM actual_material
  UNION
  SELECT spk_id, wbs_stage FROM actual_labor
  UNION
  SELECT spk_id, wbs_stage FROM actual_foh
)
SELECT 
  s.id AS spk_id,
  s.spk_number,
  s.customer_name,
  s.vehicle_plate,
  st.wbs_stage,
  
  -- 1. Pilar Bahan Baku (Material)
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

FROM stages st
JOIN public.spk s ON st.spk_id = s.id
LEFT JOIN rab_budget rb ON st.spk_id = rb.spk_id AND st.wbs_stage = rb.wbs_stage
LEFT JOIN co_budget cb ON st.spk_id = cb.spk_id AND st.wbs_stage = cb.wbs_stage
LEFT JOIN actual_material am ON st.spk_id = am.spk_id AND st.wbs_stage = am.wbs_stage
LEFT JOIN actual_labor al ON st.spk_id = al.spk_id AND st.wbs_stage = al.wbs_stage
LEFT JOIN actual_foh foh ON st.spk_id = foh.spk_id AND st.wbs_stage = foh.wbs_stage
-- SYARAT MUTLAK: Kecualikan status DRAFT & PENDING_DP
WHERE UPPER(s.status::text) NOT IN ('DRAFT', 'PENDING_DP');

GRANT SELECT ON public.view_wbs_cost_variance TO authenticated;

-- 3. Perbarui RPC get_financial_executive_summary (Abaikan SPK DRAFT & PENDING_DP)
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
      AND UPPER(spk_status::text) NOT IN ('DRAFT', 'PENDING_DP')
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
    WHERE UPPER(spk_status::text) NOT IN ('DRAFT', 'PENDING_DP')
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

GRANT EXECUTE ON FUNCTION public.get_financial_executive_summary TO authenticated;
