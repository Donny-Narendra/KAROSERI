-- ==============================================================================
-- MIGRATION: 20261019010000_fix_inventory_and_rab_item_types.sql
-- Description: 1. Add item_type to materials master catalog and backfill classification.
--              2. Update package_items constraints to support MATERIAL, LABOR, OVERHEAD
--                 and sync item_type with materials catalog.
--              3. Data Repair Patch: Fix rab_items on active SPKs (e.g. SPK-2668)
--                 where labor and overhead items were incorrectly marked as MATERIAL.
--              4. Recalculate rab_estimations totals for affected SPKs.
-- ==============================================================================

-- 1. Pastikan tabel materials memiliki kolom item_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'materials' AND column_name = 'item_type'
  ) THEN
    ALTER TABLE public.materials 
      ADD COLUMN item_type VARCHAR(20) DEFAULT 'MATERIAL' 
      CHECK (item_type IN ('MATERIAL', 'LABOR', 'OVERHEAD'));
  END IF;
END $$;

-- 2. Update klasifikasi item_type di master materials berdasarkan nama / kategori
UPDATE public.materials
SET item_type = 'LABOR'
WHERE category ILIKE '%jasa%' 
   OR category ILIKE '%labor%' 
   OR name ILIKE '%tukang%'
   OR name ILIKE '%jasa%'
   OR name ILIKE '%ongkos%'
   OR name ILIKE '%borongan%'
   OR name ILIKE '%upah%';

UPDATE public.materials
SET item_type = 'OVERHEAD'
WHERE category ILIKE '%overhead%' 
   OR name ILIKE '%listrik%'
   OR name ILIKE '%sewa bay%'
   OR name ILIKE '%bay rate%'
   OR name ILIKE '%sewa kompressor%'
   OR name ILIKE '%kompresor%';

-- 3. Pastikan tabel rincian paket assembly menyimpan/mewarisi item_type (jika ada tabel terpisah assembly_items)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assembly_items') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'assembly_items' AND column_name = 'item_type'
    ) THEN
      ALTER TABLE public.assembly_items 
        ADD COLUMN item_type VARCHAR(20) DEFAULT 'MATERIAL' 
        CHECK (item_type IN ('MATERIAL', 'LABOR', 'OVERHEAD'));

      -- Sinkronkan dengan master materials
      UPDATE public.assembly_items a
      SET item_type = m.item_type
      FROM public.materials m
      WHERE a.material_id = m.id;
    END IF;
  END IF;
END $$;

-- 3b. Sinkronkan juga pada package_items
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'package_items') THEN
    -- Drop old constraints that restrict item_type or require strict material/labor mutual exclusion
    ALTER TABLE public.package_items DROP CONSTRAINT IF EXISTS package_items_item_type_check;
    ALTER TABLE public.package_items DROP CONSTRAINT IF EXISTS valid_item_details;
    
    -- Add updated check constraint for item_type
    ALTER TABLE public.package_items 
      ADD CONSTRAINT package_items_item_type_check 
      CHECK (item_type IN ('MATERIAL', 'LABOR', 'OVERHEAD'));

    -- Relax valid_item_details: either material_id or labor_name must be present
    ALTER TABLE public.package_items
      ADD CONSTRAINT valid_item_details
      CHECK (material_id IS NOT NULL OR labor_name IS NOT NULL);

    -- Sinkronkan item_type dengan master materials
    UPDATE public.package_items pi
    SET item_type = m.item_type
    FROM public.materials m
    WHERE pi.material_id = m.id
      AND m.item_type IS NOT NULL;
  END IF;
END $$;

-- 4. PATCH DATA PERBAIKAN: Koreksi rab_items yang salah terisi MATERIAL pada SPK yang sudah aktif
UPDATE public.rab_items
SET 
  item_type = 'LABOR',
  labor_hours = CASE WHEN labor_hours IS NULL OR labor_hours = 0 THEN quantity ELSE labor_hours END,
  labor_rate = CASE WHEN labor_rate IS NULL OR labor_rate = 0 THEN unit_price ELSE labor_rate END
WHERE item_type = 'MATERIAL'
  AND (
    material_name ILIKE '%tukang%'
    OR material_name ILIKE '%jasa%'
    OR material_name ILIKE '%ongkos%'
    OR material_name ILIKE '%borongan%'
    OR material_name ILIKE '%upah%'
    OR material_name ILIKE '%tenaga%'
  );

UPDATE public.rab_items
SET 
  item_type = 'OVERHEAD',
  overhead_hours = CASE WHEN overhead_hours IS NULL OR overhead_hours = 0 THEN quantity * 8 ELSE overhead_hours END,
  overhead_rate = CASE WHEN overhead_rate IS NULL OR overhead_rate = 0 THEN ROUND((unit_price / 8)::numeric, 2) ELSE overhead_rate END
WHERE item_type = 'MATERIAL'
  AND (
    material_name ILIKE '%listrik%'
    OR material_name ILIKE '%sewa bay%'
    OR material_name ILIKE '%bay rate%'
    OR material_name ILIKE '%sewa kompressor%'
    OR material_name ILIKE '%kompresor%'
  );

-- 5. Recalculate rab_estimations for all affected records
UPDATE public.rab_estimations re
SET 
  total_material_cost = COALESCE(calc.material_cost, 0),
  total_labor_cost = COALESCE(calc.labor_cost, 0),
  total_overhead_cost = COALESCE(calc.overhead_cost, 0),
  total_estimated_cost = COALESCE(calc.total_cost, 0)
FROM (
  SELECT 
    rab_estimation_id,
    SUM(CASE WHEN item_type = 'MATERIAL' OR item_type IS NULL THEN COALESCE(item_total, quantity * unit_price) ELSE 0 END) AS material_cost,
    SUM(CASE WHEN item_type = 'LABOR' THEN COALESCE(item_total, quantity * unit_price) ELSE 0 END) AS labor_cost,
    SUM(CASE WHEN item_type = 'OVERHEAD' THEN COALESCE(item_total, quantity * unit_price) ELSE 0 END) AS overhead_cost,
    SUM(COALESCE(item_total, quantity * unit_price)) AS total_cost
  FROM public.rab_items
  GROUP BY rab_estimation_id
) calc
WHERE re.id = calc.rab_estimation_id;
