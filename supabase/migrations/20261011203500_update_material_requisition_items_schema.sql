-- Migration: Update material_requisition_items schema
-- 1. Allow material_id to be nullable (for custom/non-stock materials and RAB items without master catalog record)
-- 2. Add rab_item_id to explicitly reference the originating RAB item
-- 3. Add material_name and unit to retain material snapshot if material_id is null

DO $$
BEGIN
  -- Drop NOT NULL constraint on material_id
  ALTER TABLE public.material_requisition_items ALTER COLUMN material_id DROP NOT NULL;

  -- Add rab_item_id column referencing rab_items
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'material_requisition_items' AND column_name = 'rab_item_id'
  ) THEN
    ALTER TABLE public.material_requisition_items 
      ADD COLUMN rab_item_id uuid REFERENCES public.rab_items(id) ON DELETE SET NULL;
  END IF;

  -- Add material_name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'material_requisition_items' AND column_name = 'material_name'
  ) THEN
    ALTER TABLE public.material_requisition_items 
      ADD COLUMN material_name text;
  END IF;

  -- Add unit column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'material_requisition_items' AND column_name = 'unit'
  ) THEN
    ALTER TABLE public.material_requisition_items 
      ADD COLUMN unit text;
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_material_req_items_rab_item_id 
  ON public.material_requisition_items(rab_item_id);
