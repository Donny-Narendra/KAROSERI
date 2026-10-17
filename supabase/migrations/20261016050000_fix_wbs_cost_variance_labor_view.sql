-- ==============================================================================
-- REVISION: VIEW ANALISIS VARIAN ANGGARAN (RAB VS ACTUAL VARIANCE PER WBS)
-- MEMASTIKAN PAGU JASA (LABOR) DAN BAHAN (MATERIAL) TERAGREGASI TEPAT
-- ==============================================================================

CREATE OR REPLACE VIEW view_wbs_cost_variance AS
WITH rab_budget AS (
  SELECT 
    spk_id,
    wbs_stage,
    COALESCE(SUM(CASE WHEN item_type = 'MATERIAL' OR item_type IS NULL THEN quantity * unit_price ELSE 0 END), 0) AS rab_material_budget,
    COALESCE(SUM(CASE WHEN item_type = 'LABOR' THEN quantity * unit_price ELSE 0 END), 0) AS rab_labor_budget
  FROM rab_items
  GROUP BY spk_id, wbs_stage
),
co_budget AS (
  SELECT 
    spk_id,
    wbs_stage,
    COALESCE(SUM(CASE WHEN item_type = 'MATERIAL' OR item_type IS NULL THEN quantity * unit_price ELSE 0 END), 0) AS co_material_budget,
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
  
  -- 1. Pagu Material (RAB Awal + Approved Change Orders)
  (COALESCE(rb.rab_material_budget, 0) + COALESCE(cb.co_material_budget, 0)) AS total_material_budget,
  COALESCE(am.actual_material_spent, 0) AS actual_material_spent,
  ((COALESCE(rb.rab_material_budget, 0) + COALESCE(cb.co_material_budget, 0)) - COALESCE(am.actual_material_spent, 0)) AS material_variance,
  
  -- 2. Pagu Jasa / Labor (RAB Awal + Approved Change Orders)
  (COALESCE(rb.rab_labor_budget, 0) + COALESCE(cb.co_labor_budget, 0)) AS total_labor_budget,
  COALESCE(al.actual_labor_spent, 0) AS actual_labor_spent,
  ((COALESCE(rb.rab_labor_budget, 0) + COALESCE(cb.co_labor_budget, 0)) - COALESCE(al.actual_labor_spent, 0)) AS labor_variance

FROM rab_budget rb
JOIN spk s ON rb.spk_id = s.id
LEFT JOIN co_budget cb ON rb.spk_id = cb.spk_id AND rb.wbs_stage = cb.wbs_stage
LEFT JOIN actual_material am ON rb.spk_id = am.spk_id AND rb.wbs_stage = am.wbs_stage
LEFT JOIN actual_labor al ON rb.spk_id = al.spk_id AND rb.wbs_stage = al.wbs_stage;

-- Pastikan izin akses view tetap aktif untuk role terautentikasi
GRANT SELECT ON view_wbs_cost_variance TO authenticated;
