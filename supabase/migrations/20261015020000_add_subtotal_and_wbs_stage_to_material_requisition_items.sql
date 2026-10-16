-- ============================================================================
-- Migrasi: Penambahan Kolom subtotal & wbs_stage pada material_requisition_items
-- File: supabase/migrations/20261015020000_add_subtotal_and_wbs_stage_to_material_requisition_items.sql
-- Tujuan:
-- 1. Menyimpan snapshot subtotal dan wbs_stage pada setiap item permintaan material
-- 2. Memastikan audit konsistensi WBS selaras antara tiket dan item
-- 3. Membackfill unit_price, subtotal, dan material_id untuk item bernilai Rp 0
-- ============================================================================

-- 1. Tambahkan kolom subtotal dan wbs_stage jika belum ada
ALTER TABLE public.material_requisition_items 
ADD COLUMN IF NOT EXISTS subtotal NUMERIC(15, 2) DEFAULT 0;

ALTER TABLE public.material_requisition_items 
ADD COLUMN IF NOT EXISTS wbs_stage TEXT;

-- 2. Sinkronkan wbs_stage dari tabel induk material_requisitions
UPDATE public.material_requisition_items mri
SET wbs_stage = mr.wbs_category::text
FROM public.material_requisitions mr
WHERE mri.requisition_id = mr.id
  AND (mri.wbs_stage IS NULL OR mri.wbs_stage = '');

-- 3. Backfill material_id jika null berdasarkan kecocokan nama pada master materials
UPDATE public.material_requisition_items mri
SET material_id = m.id
FROM public.materials m
WHERE mri.material_id IS NULL
  AND LOWER(TRIM(mri.material_name)) = LOWER(TRIM(m.name));

-- 4. Backfill unit_price dari master materials jika masih 0 atau null
UPDATE public.material_requisition_items mri
SET unit_price = COALESCE(m.unit_price, 0)
FROM public.materials m
WHERE (mri.material_id = m.id OR LOWER(TRIM(mri.material_name)) = LOWER(TRIM(m.name)))
  AND (mri.unit_price IS NULL OR mri.unit_price = 0);

-- 5. Backfill unit_price dari rab_items jika masih 0 dan terdapat entri RAB terkait
UPDATE public.material_requisition_items mri
SET unit_price = CASE 
    WHEN ri.quantity > 0 THEN ROUND(ri.item_total / ri.quantity, 2)
    ELSE ri.item_total 
  END
FROM public.material_requisitions mr
JOIN public.rab_estimations re ON re.spk_id = mr.spk_id
JOIN public.rab_items ri ON ri.rab_estimation_id = re.id
WHERE mri.requisition_id = mr.id
  AND (mri.unit_price IS NULL OR mri.unit_price = 0)
  AND (mri.rab_item_id = ri.id OR LOWER(TRIM(mri.material_name)) = LOWER(TRIM(ri.description)));

-- 6. Hitung dan perbarui subtotal untuk seluruh baris
UPDATE public.material_requisition_items
SET subtotal = ROUND(COALESCE(quantity, 0) * COALESCE(unit_price, 0), 2)
WHERE subtotal IS NULL OR subtotal = 0;

-- 7. Tambahkan komentar kolom
COMMENT ON COLUMN public.material_requisition_items.subtotal IS 'Subtotal estimasi biaya item (quantity * unit_price)';
COMMENT ON COLUMN public.material_requisition_items.wbs_stage IS 'Tahapan WBS tempat material dialokasikan / diminta';
