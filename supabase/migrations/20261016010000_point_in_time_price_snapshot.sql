-- ============================================================================
-- Migration: Point-in-Time Price Snapshot & Document Locking across KaroseriOps
-- File: supabase/migrations/20261016010000_point_in_time_price_snapshot.sql
-- ============================================================================

-- 1. Pastikan tabel master materials memiliki pemisahan harga beli (HPP) dan harga jual patokan
ALTER TABLE public.materials
ADD COLUMN IF NOT EXISTS cost_price NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS selling_price NUMERIC(15, 2) DEFAULT 0;

-- Inisialisasi/Backfill nilai awal cost_price dan selling_price dari unit_price
UPDATE public.materials
SET 
  selling_price = CASE WHEN COALESCE(selling_price, 0) = 0 THEN COALESCE(unit_price, 0) ELSE selling_price END,
  cost_price = CASE WHEN COALESCE(cost_price, 0) = 0 THEN ROUND(COALESCE(unit_price, 0) * 0.8, 2) ELSE cost_price END
WHERE COALESCE(selling_price, 0) = 0 OR COALESCE(cost_price, 0) = 0;


-- 2. Pastikan tabel item RAB menyimpan snapshot mandiri (Point-in-Time)
-- Tambahkan relasi langsung spk_id ke rab_items jika belum ada
ALTER TABLE public.rab_items
ADD COLUMN IF NOT EXISTS spk_id UUID REFERENCES public.spk(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS material_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_price NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS subtotal NUMERIC(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;

-- Backfill spk_id pada rab_items dari rab_estimations
UPDATE public.rab_items ri
SET spk_id = re.spk_id
FROM public.rab_estimations re
WHERE ri.rab_estimation_id = re.id AND ri.spk_id IS NULL;

-- Backfill data historis rab_items (unit_price, cost_price, material_name)
UPDATE public.rab_items ri
SET 
  unit_price = CASE 
    WHEN ri.unit_price > 0 THEN ri.unit_price
    WHEN ri.quantity > 0 AND ri.item_total > 0 THEN ROUND(ri.item_total / ri.quantity, 2)
    WHEN m.unit_price IS NOT NULL THEN m.unit_price
    ELSE 0
  END,
  cost_price = CASE
    WHEN ri.cost_price > 0 THEN ri.cost_price
    WHEN m.cost_price IS NOT NULL AND m.cost_price > 0 THEN m.cost_price
    WHEN m.unit_price IS NOT NULL THEN ROUND(m.unit_price * 0.8, 2)
    ELSE 0
  END,
  material_name = COALESCE(ri.material_name, m.name, ri.description, 'Item Pekerjaan / Material')
FROM public.materials m
WHERE ri.material_id = m.id AND (ri.material_name IS NULL OR ri.unit_price = 0);

-- Backfill sisa item tanpa material_id (misal tenaga kerja/overhead/deskripsi custom)
UPDATE public.rab_items
SET 
  material_name = COALESCE(material_name, description, 'Item RAB'),
  unit_price = CASE 
    WHEN unit_price > 0 THEN unit_price
    WHEN quantity > 0 AND item_total > 0 THEN ROUND(item_total / quantity, 2)
    ELSE 0
  END
WHERE material_name IS NULL OR unit_price = 0;


-- 3. Pastikan tabel requisition items Mandor menyimpan snapshot harga saat diajukan
-- Dukung tabel requisition_items dan material_requisition_items
CREATE TABLE IF NOT EXISTS public.requisition_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id UUID REFERENCES public.material_requisitions(id) ON DELETE CASCADE,
  material_id UUID REFERENCES public.materials(id),
  material_name VARCHAR(255),
  quantity NUMERIC(15, 2) DEFAULT 0,
  unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
  cost_price NUMERIC(15, 2) DEFAULT 0,
  subtotal NUMERIC(15, 2) DEFAULT 0,
  unit VARCHAR(50) DEFAULT 'pcs',
  status VARCHAR(50) DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.requisition_items
ADD COLUMN IF NOT EXISTS unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_price NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS subtotal NUMERIC(15, 2) DEFAULT 0;

ALTER TABLE public.material_requisition_items
ADD COLUMN IF NOT EXISTS unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_price NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS subtotal NUMERIC(15, 2) DEFAULT 0;

-- Backfill subtotal dan cost_price pada material_requisition_items
UPDATE public.material_requisition_items mri
SET 
  cost_price = CASE 
    WHEN mri.cost_price > 0 THEN mri.cost_price
    WHEN m.cost_price IS NOT NULL AND m.cost_price > 0 THEN m.cost_price
    WHEN mri.unit_price > 0 THEN ROUND(mri.unit_price * 0.8, 2)
    ELSE 0
  END,
  subtotal = CASE 
    WHEN mri.subtotal > 0 THEN mri.subtotal
    ELSE ROUND(mri.quantity * mri.unit_price, 2)
  END
FROM public.materials m
WHERE mri.material_id = m.id AND (mri.cost_price = 0 OR mri.subtotal = 0);


-- 4. Penguncian Status Dokumen pada tabel SPK / orders
ALTER TABLE public.spk
ADD COLUMN IF NOT EXISTS is_pricing_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES auth.users(id);

-- Kunci status untuk SPK yang sudah aktif, disetujui, atau selesai
UPDATE public.spk
SET 
  is_pricing_locked = TRUE,
  locked_at = COALESCE(locked_at, created_at)
WHERE status::text IN ('ACTIVE', 'APPROVED', 'IN_PROGRESS', 'COMPLETED') AND is_pricing_locked IS NOT TRUE;

-- Kunci juga seluruh rab_items milik SPK yang sudah terkunci
UPDATE public.rab_items ri
SET is_locked = TRUE
FROM public.spk s
WHERE (ri.spk_id = s.id OR ri.rab_estimation_id IN (SELECT id FROM public.rab_estimations WHERE spk_id = s.id))
  AND s.is_pricing_locked = TRUE;


-- 5. Trigger Pengamanan: Kunci otomatis seluruh baris rab_items saat SPK aktif / disetujui
CREATE OR REPLACE FUNCTION public.lock_spk_pricing_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.status::text IN ('ACTIVE', 'APPROVED', 'IN_PROGRESS', 'COMPLETED') AND (OLD.status::text = 'DRAFT' OR OLD.status::text = 'PENDING_PAYMENT' OR OLD.is_pricing_locked IS NOT TRUE)) THEN
    NEW.is_pricing_locked := TRUE;
    NEW.locked_at := COALESCE(NEW.locked_at, NOW());
    
    -- Kunci seluruh item RAB terkait
    UPDATE public.rab_items 
    SET is_locked = TRUE 
    WHERE spk_id = NEW.id OR rab_estimation_id IN (SELECT id FROM public.rab_estimations WHERE spk_id = NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lock_spk_pricing ON public.spk;
CREATE TRIGGER trg_lock_spk_pricing
BEFORE UPDATE ON public.spk
FOR EACH ROW
EXECUTE FUNCTION public.lock_spk_pricing_on_approval();
