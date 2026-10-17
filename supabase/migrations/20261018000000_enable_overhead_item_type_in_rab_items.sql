-- ==============================================================================
-- MIGRATION: 20261018000000_enable_overhead_item_type_in_rab_items.sql
-- Description: Enable 'OVERHEAD' in rab_items.item_type check constraint,
--              backfill historical overhead items, and synchronize view_wbs_cost_variance.
-- ==============================================================================

-- 1. Drop and Recreate Check Constraint on rab_items.item_type
ALTER TABLE public.rab_items 
  DROP CONSTRAINT IF EXISTS rab_items_item_type_check;

ALTER TABLE public.rab_items 
  ADD CONSTRAINT rab_items_item_type_check 
  CHECK (item_type IN ('MATERIAL', 'LABOR', 'OVERHEAD'));

-- 2. Backfill Historical Overhead Items in rab_items
UPDATE public.rab_items
SET 
  item_type = 'OVERHEAD',
  unit_price = CASE 
    WHEN (unit_price IS NULL OR unit_price = 0) AND quantity > 0 AND item_total > 0 THEN 
      ROUND((item_total / quantity)::numeric, 2)
    WHEN (unit_price IS NULL OR unit_price = 0) AND overhead_rate > 0 THEN 
      overhead_rate * 8
    ELSE unit_price 
  END,
  cost_price = CASE 
    WHEN (cost_price IS NULL OR cost_price = 0) AND quantity > 0 AND item_total > 0 THEN 
      ROUND((item_total / quantity)::numeric, 2)
    WHEN (cost_price IS NULL OR cost_price = 0) AND overhead_rate > 0 THEN 
      overhead_rate * 8
    ELSE cost_price 
  END
WHERE (overhead_hours > 0 OR overhead_rate > 0 OR material_name ILIKE '%overhead%' OR material_name ILIKE '%listrik%')
  AND item_type = 'MATERIAL';

-- 3. Synchronize view_wbs_cost_variance with Resilient Overhead Calculation
DROP VIEW IF EXISTS public.view_wbs_cost_variance CASCADE;

CREATE OR REPLACE VIEW public.view_wbs_cost_variance AS
WITH rab_budget AS (
  SELECT 
    spk_id,
    wbs_stage,
    COALESCE(SUM(CASE WHEN item_type = 'MATERIAL' OR item_type IS NULL THEN COALESCE(item_total, quantity * unit_price) ELSE 0 END), 0) AS rab_material_budget,
    COALESCE(SUM(CASE WHEN item_type = 'LABOR' THEN COALESCE(item_total, quantity * unit_price) ELSE 0 END), 0) AS rab_labor_budget,
    COALESCE(SUM(CASE WHEN item_type = 'OVERHEAD' THEN COALESCE(item_total, quantity * unit_price) ELSE 0 END), 0) AS rab_overhead_budget
  FROM rab_items
  GROUP BY spk_id, wbs_stage
),
co_budget AS (
  SELECT 
    spk_id,
    wbs_stage,
    COALESCE(SUM(CASE WHEN item_type = 'MATERIAL' OR item_type IS NULL THEN COALESCE(subtotal, quantity * unit_price) ELSE 0 END), 0) AS co_material_budget,
    COALESCE(SUM(CASE WHEN item_type = 'LABOR' THEN COALESCE(subtotal, quantity * unit_price) ELSE 0 END), 0) AS co_labor_budget,
    COALESCE(SUM(CASE WHEN item_type = 'OVERHEAD' THEN COALESCE(subtotal, quantity * unit_price) ELSE 0 END), 0) AS co_overhead_budget
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
),
all_stages AS (
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

FROM all_stages st
JOIN spk s ON st.spk_id = s.id
LEFT JOIN rab_budget rb ON st.spk_id = rb.spk_id AND st.wbs_stage = rb.wbs_stage
LEFT JOIN co_budget cb ON st.spk_id = cb.spk_id AND st.wbs_stage = cb.wbs_stage
LEFT JOIN actual_material am ON st.spk_id = am.spk_id AND st.wbs_stage = am.wbs_stage
LEFT JOIN actual_labor al ON st.spk_id = al.spk_id AND st.wbs_stage = al.wbs_stage
LEFT JOIN actual_foh foh ON st.spk_id = foh.spk_id AND st.wbs_stage = foh.wbs_stage;

GRANT SELECT ON public.view_wbs_cost_variance TO authenticated;
