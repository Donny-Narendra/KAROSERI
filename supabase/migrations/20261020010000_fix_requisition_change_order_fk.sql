-- Migration: 20261020010000_fix_requisition_change_order_fk.sql
-- Description: Allow material_requisition_items to reference change_order_items and make rab_item_id nullable.

-- 1. Pastikan kolom rab_item_id bersifat nullable
ALTER TABLE public.material_requisition_items 
  ALTER COLUMN rab_item_id DROP NOT NULL;

-- 2. Tambahkan kolom foreign key opsional ke change_order_items jika belum ada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'material_requisition_items' AND column_name = 'change_order_item_id'
  ) THEN
    ALTER TABLE public.material_requisition_items 
      ADD COLUMN change_order_item_id UUID REFERENCES public.change_order_items(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Beri indeks untuk performa query
CREATE INDEX IF NOT EXISTS idx_material_req_items_co_id 
  ON public.material_requisition_items(change_order_item_id);
