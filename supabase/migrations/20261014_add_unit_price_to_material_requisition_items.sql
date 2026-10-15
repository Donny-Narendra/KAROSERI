-- ============================================================================
-- Migrasi: Penambahan Kolom unit_price pada material_requisition_items
-- File: supabase/migrations/20261014_add_unit_price_to_material_requisition_items.sql
-- Tujuan:
-- 1. Menyimpan snapshot harga satuan pada item permintaan material (requisition)
-- 2. Memudahkan perhitungan estimasi biaya total permintaan mandor di Gudang
-- 3. Memverifikasi kepatuhan pagu Gate 2 (RAB vs Aktual) sebelum approval
-- ============================================================================

-- 1. Tambahkan kolom unit_price jika belum ada
ALTER TABLE public.material_requisition_items 
ADD COLUMN IF NOT EXISTS unit_price NUMERIC(15, 2) DEFAULT 0;

-- 2. Backfill nilai unit_price dari master materials untuk baris item yang sudah ada
UPDATE public.material_requisition_items mri
SET unit_price = COALESCE(m.unit_price, 0)
FROM public.materials m
WHERE mri.material_id = m.id
  AND (mri.unit_price IS NULL OR mri.unit_price = 0);

-- 3. Tambahkan komentar kolom
COMMENT ON COLUMN public.material_requisition_items.unit_price IS 'Estimasi harga satuan material saat diajukan (snapshot dari master materials atau estimasi RAB)';
