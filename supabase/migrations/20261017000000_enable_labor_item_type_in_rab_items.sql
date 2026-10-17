-- ==============================================================================
-- MIGRATION: 20261017000000_enable_labor_item_type_in_rab_items.sql
-- Description: Replace generated item_type with standard VARCHAR(20) DEFAULT 'MATERIAL'
--              in rab_items, backfill historical labor items, update rab_estimations,
--              and refresh view_wbs_cost_variance.
-- ==============================================================================

-- 1. Drop view dependent on rab_items.item_type
DROP VIEW IF EXISTS public.view_wbs_cost_variance CASCADE;

-- 2. Transition item_type on rab_items from generated column to standard column
DO $$
BEGIN
  -- If item_type exists as a generated column, drop it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rab_items' 
      AND column_name = 'item_type' 
      AND is_generated = 'ALWAYS'
  ) THEN
    ALTER TABLE public.rab_items DROP COLUMN item_type;
  END IF;
  
  -- Add standard item_type column if it does not exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rab_items' 
      AND column_name = 'item_type'
  ) THEN
    ALTER TABLE public.rab_items ADD COLUMN item_type VARCHAR(20) DEFAULT 'MATERIAL';
  END IF;
END $$;

-- Enforce check constraint for item_type if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rab_items_item_type_check'
  ) THEN
    ALTER TABLE public.rab_items 
    ADD CONSTRAINT rab_items_item_type_check CHECK (item_type IN ('MATERIAL', 'LABOR'));
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 3. Backfill historical rab_items where material_name represents labor / jasa
UPDATE public.rab_items 
SET item_type = 'LABOR' 
WHERE item_type IS NULL 
   OR (
     item_type = 'MATERIAL' 
     AND (
       material_name ILIKE '%jasa%' 
       OR material_name ILIKE '%ongkos%' 
       OR material_name ILIKE '%borongan%' 
       OR material_name ILIKE '%tukang%'
       OR material_name ILIKE '%upah%'
       OR material_name ILIKE '%tenaga%'
     )
   );

-- 4. Backfill historical change_order_items where item_name represents labor / jasa
UPDATE public.change_order_items
SET item_type = 'LABOR'
WHERE item_type IS NULL
   OR (
     item_type = 'MATERIAL'
     AND (
       item_name ILIKE '%jasa%' 
       OR item_name ILIKE '%ongkos%' 
       OR item_name ILIKE '%borongan%' 
       OR item_name ILIKE '%tukang%'
       OR item_name ILIKE '%upah%'
       OR item_name ILIKE '%tenaga%'
     )
   );

-- 5. Backfill rab_estimations total_labor_cost & total_material_cost
UPDATE public.rab_estimations re
SET 
  total_labor_cost = COALESCE(sub.labor_total, 0),
  total_material_cost = COALESCE(sub.material_total, 0)
FROM (
  SELECT 
    rab_estimation_id,
    COALESCE(SUM(CASE WHEN item_type = 'LABOR' THEN COALESCE(item_total, quantity * unit_price) ELSE 0 END), 0) AS labor_total,
    COALESCE(SUM(CASE WHEN item_type = 'MATERIAL' THEN COALESCE(item_total, quantity * unit_price) ELSE 0 END), 0) AS material_total
  FROM public.rab_items
  GROUP BY rab_estimation_id
) sub
WHERE re.id = sub.rab_estimation_id;

-- 6. Recreate view_wbs_cost_variance with union of active stages and item_total fallback
CREATE OR REPLACE VIEW public.view_wbs_cost_variance AS
WITH rab_budget AS (
  SELECT 
    spk_id,
    wbs_stage,
    COALESCE(SUM(CASE WHEN item_type = 'MATERIAL' THEN COALESCE(item_total, quantity * unit_price) ELSE 0 END), 0) AS rab_material_budget,
    COALESCE(SUM(CASE WHEN item_type = 'LABOR' THEN COALESCE(item_total, quantity * unit_price) ELSE 0 END), 0) AS rab_labor_budget
  FROM public.rab_items
  GROUP BY spk_id, wbs_stage
),
co_budget AS (
  SELECT 
    spk_id,
    wbs_stage,
    COALESCE(SUM(CASE WHEN item_type = 'MATERIAL' THEN COALESCE(subtotal, quantity * unit_price) ELSE 0 END), 0) AS co_material_budget,
    COALESCE(SUM(CASE WHEN item_type = 'LABOR' THEN COALESCE(subtotal, quantity * unit_price) ELSE 0 END), 0) AS co_labor_budget
  FROM public.change_order_items
  GROUP BY spk_id, wbs_stage
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
)
SELECT 
  s.id AS spk_id,
  s.spk_number,
  s.customer_name,
  s.vehicle_plate,
  st.wbs_stage,
  -- Pagu Material (RAB Awal + Change Orders)
  (COALESCE(rb.rab_material_budget, 0) + COALESCE(cb.co_material_budget, 0)) AS total_material_budget,
  COALESCE(am.actual_material_spent, 0) AS actual_material_spent,
  ((COALESCE(rb.rab_material_budget, 0) + COALESCE(cb.co_material_budget, 0)) - COALESCE(am.actual_material_spent, 0)) AS material_variance,
  -- Pagu Jasa / Labor
  (COALESCE(rb.rab_labor_budget, 0) + COALESCE(cb.co_labor_budget, 0)) AS total_labor_budget,
  COALESCE(al.actual_labor_spent, 0) AS actual_labor_spent,
  ((COALESCE(rb.rab_labor_budget, 0) + COALESCE(cb.co_labor_budget, 0)) - COALESCE(al.actual_labor_spent, 0)) AS labor_variance
FROM stages st
JOIN public.spk s ON st.spk_id = s.id
LEFT JOIN rab_budget rb ON st.spk_id = rb.spk_id AND st.wbs_stage = rb.wbs_stage
LEFT JOIN co_budget cb ON st.spk_id = cb.spk_id AND st.wbs_stage = cb.wbs_stage
LEFT JOIN actual_material am ON st.spk_id = am.spk_id AND st.wbs_stage = am.wbs_stage
LEFT JOIN actual_labor al ON st.spk_id = al.spk_id AND st.wbs_stage = al.wbs_stage;
