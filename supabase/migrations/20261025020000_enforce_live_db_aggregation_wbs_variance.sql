-- ==============================================================================
-- Migration: 20261025020000_enforce_live_db_aggregation_wbs_variance.sql
-- Description: Enforce pure live PostgreSQL aggregation for Pagu, Realisasi, 
--              and Variance (Zero Hardcoded Values) on view_wbs_cost_variance
-- ==============================================================================

-- 1. Ensure goods_issues view is available for approved material issues from warehouse
CREATE OR REPLACE VIEW public.goods_issues AS
SELECT 
  it.id,
  it.spk_id,
  it.material_id,
  it.quantity_issued AS quantity,
  COALESCE(it.custom_unit_price, m.cost_price, m.unit_price, 0) AS unit_price,
  it.custom_unit_price,
  COALESCE(it.wbs_stage, wbs_category_to_stage(mr.wbs_category), 'WBS 1: Pembongkaran') AS wbs_stage,
  it.status,
  it.issued_by_user_id,
  it.issued_by_name,
  it.issued_by_role,
  it.audit_notes,
  it.package_name,
  it.source_type,
  it.change_order_id,
  it.issued_at AS created_at
FROM public.inventory_transactions it
LEFT JOIN public.materials m ON it.material_id = m.id
LEFT JOIN public.material_requisitions mr ON it.requisition_id = mr.id;

GRANT SELECT ON public.goods_issues TO authenticated;

-- 2. Backfill wbs_stage on rab_items if null
UPDATE public.rab_items
SET wbs_stage = wbs_category_to_stage(wbs_category)
WHERE wbs_stage IS NULL AND wbs_category IS NOT NULL;

-- 3. Recreate view_wbs_cost_variance with pure live database aggregation
DROP VIEW IF EXISTS public.view_wbs_cost_variance CASCADE;

CREATE VIEW public.view_wbs_cost_variance AS
WITH consolidated_budget AS (
  -- 1. Pagu dari RAB Awal
  SELECT 
    spk_id,
    COALESCE(wbs_stage, wbs_category_to_stage(wbs_category)) AS wbs_stage,
    item_type,
    quantity,
    cost_price
  FROM public.rab_items
  WHERE cost_price > 0
  
  UNION ALL
  
  -- 2. Pagu dari Amandemen Change Order (Khusus yang APPROVED)
  SELECT 
    co.spk_id,
    COALESCE(coi.wbs_stage, 'WBS 1: Pembongkaran') AS wbs_stage,
    coi.item_type,
    coi.quantity,
    coi.cost_price
  FROM public.change_order_items coi
  JOIN public.change_orders co ON coi.change_order_id = co.id
  WHERE co.status = 'APPROVED' AND coi.cost_price > 0
),
pagu_per_wbs AS (
  SELECT 
    spk_id,
    wbs_stage,
    COALESCE(SUM(CASE WHEN item_type = 'MATERIAL' THEN quantity * cost_price ELSE 0 END), 0) AS total_material_budget,
    COALESCE(SUM(CASE WHEN item_type = 'LABOR' THEN quantity * cost_price ELSE 0 END), 0) AS total_labor_budget,
    COALESCE(SUM(CASE WHEN item_type = 'OVERHEAD' THEN quantity * cost_price ELSE 0 END), 0) AS total_overhead_budget
  FROM consolidated_budget
  GROUP BY spk_id, wbs_stage
),
realisasi_material AS (
  -- Murni barang yang sudah diapprove petugas gudang (Goods Issue)
  SELECT 
    spk_id,
    wbs_stage,
    COALESCE(SUM(quantity * COALESCE(custom_unit_price, unit_price, 0)), 0) AS actual_material_spent
  FROM public.goods_issues
  WHERE status IS NULL OR UPPER(status) NOT IN ('VOIDED', 'CANCELLED')
  GROUP BY spk_id, wbs_stage
),
realisasi_labor AS (
  -- Murni SPK Borongan yang terbit / aktif
  SELECT 
    spk_id,
    wbs_stage,
    COALESCE(SUM(COALESCE(contract_value, total_amount, 0)), 0) AS actual_labor_spent
  FROM public.spk_borongan
  WHERE UPPER(status::text) NOT IN ('CANCELLED')
  GROUP BY spk_id, wbs_stage
),
realisasi_overhead AS (
  -- Murni log riil utilitas / sewa bay yang dicatat
  SELECT 
    spk_id,
    wbs_stage,
    COALESCE(SUM(total_amount), 0) AS actual_overhead_spent
  FROM public.spk_overhead_logs
  GROUP BY spk_id, wbs_stage
),
stages AS (
  SELECT spk_id, wbs_stage FROM pagu_per_wbs
  UNION
  SELECT spk_id, wbs_stage FROM realisasi_material
  UNION
  SELECT spk_id, wbs_stage FROM realisasi_labor
  UNION
  SELECT spk_id, wbs_stage FROM realisasi_overhead
)
SELECT 
  s.id AS spk_id,
  COALESCE(s.spk_number, s.spk_no) AS spk_number,
  s.customer_name,
  s.vehicle_plate,
  st.wbs_stage,
  
  -- Pagu HPP
  COALESCE(p.total_material_budget, 0) AS total_material_budget,
  COALESCE(p.total_labor_budget, 0) AS total_labor_budget,
  COALESCE(p.total_overhead_budget, 0) AS total_overhead_budget,
  (COALESCE(p.total_material_budget, 0) + COALESCE(p.total_labor_budget, 0) + COALESCE(p.total_overhead_budget, 0)) AS total_wbs_budget,

  -- Realisasi Fisik Lapangan
  COALESCE(rm.actual_material_spent, 0) AS actual_material_spent,
  COALESCE(rl.actual_labor_spent, 0) AS actual_labor_spent,
  COALESCE(ro.actual_overhead_spent, 0) AS actual_overhead_spent,
  (COALESCE(rm.actual_material_spent, 0) + COALESCE(rl.actual_labor_spent, 0) + COALESCE(ro.actual_overhead_spent, 0)) AS total_actual_wbs_spent,

  -- Varian Dinamis (Pagu - Realisasi)
  (COALESCE(p.total_material_budget, 0) - COALESCE(rm.actual_material_spent, 0)) AS material_variance,
  (COALESCE(p.total_labor_budget, 0) - COALESCE(rl.actual_labor_spent, 0)) AS labor_variance,
  (COALESCE(p.total_overhead_budget, 0) - COALESCE(ro.actual_overhead_spent, 0)) AS overhead_variance,
  ((COALESCE(p.total_material_budget, 0) + COALESCE(p.total_labor_budget, 0) + COALESCE(p.total_overhead_budget, 0)) - 
   (COALESCE(rm.actual_material_spent, 0) + COALESCE(rl.actual_labor_spent, 0) + COALESCE(ro.actual_overhead_spent, 0))) AS total_wbs_variance,

  -- Status Otomatis
  CASE 
    WHEN (COALESCE(p.total_material_budget, 0) - COALESCE(rm.actual_material_spent, 0)) < 0 
      OR (COALESCE(p.total_labor_budget, 0) - COALESCE(rl.actual_labor_spent, 0)) < 0 
      OR (COALESCE(p.total_overhead_budget, 0) - COALESCE(ro.actual_overhead_spent, 0)) < 0 
    THEN 'OVERBUDGET'
    ELSE 'HEMAT / DALAM BATAS'
  END AS wbs_budget_status

FROM stages st
JOIN public.spk s ON st.spk_id = s.id
LEFT JOIN pagu_per_wbs p ON st.spk_id = p.spk_id AND st.wbs_stage = p.wbs_stage
LEFT JOIN realisasi_material rm ON st.spk_id = rm.spk_id AND st.wbs_stage = rm.wbs_stage
LEFT JOIN realisasi_labor rl ON st.spk_id = rl.spk_id AND st.wbs_stage = rl.wbs_stage
LEFT JOIN realisasi_overhead ro ON st.spk_id = ro.spk_id AND st.wbs_stage = ro.wbs_stage
WHERE UPPER(s.status::text) NOT IN ('DRAFT', 'PENDING_PAYMENT');

GRANT SELECT ON public.view_wbs_cost_variance TO authenticated;
