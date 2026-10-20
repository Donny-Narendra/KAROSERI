-- ==============================================================================
-- MIGRATION: 20261020020000_ingest_co_labor_overhead_into_mandor.sql
-- Description: Ingest Approved Change Order Labor and Overhead Items into Mandor Workflows
-- 1. Add change_order_item_id foreign key to spk_borongan
-- 2. Add change_order_item_id foreign key to spk_overhead_logs
-- 3. Recreate view_wbs_cost_variance with approved Change Order 3-element budget aggregation
-- ==============================================================================

-- 1. Tambah kolom change_order_item_id ke spk_borongan
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'spk_borongan' 
      AND column_name = 'change_order_item_id'
  ) THEN
    ALTER TABLE public.spk_borongan
      ADD COLUMN change_order_item_id UUID REFERENCES public.change_order_items(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_spk_borongan_co_item_id 
  ON public.spk_borongan(change_order_item_id);

-- 2. Tambah kolom change_order_item_id ke spk_overhead_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'spk_overhead_logs' 
      AND column_name = 'change_order_item_id'
  ) THEN
    ALTER TABLE public.spk_overhead_logs
      ADD COLUMN change_order_item_id UUID REFERENCES public.change_order_items(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_spk_overhead_logs_co_item_id 
  ON public.spk_overhead_logs(change_order_item_id);

-- 3. Perbarui VIEW Analisis Varian Anggaran WBS (3 Pilar: Material, Labor, Overhead)
DROP VIEW IF EXISTS public.view_wbs_cost_variance CASCADE;

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
LEFT JOIN actual_foh foh ON st.spk_id = foh.spk_id AND st.wbs_stage = foh.wbs_stage;

GRANT SELECT ON public.view_wbs_cost_variance TO authenticated;
