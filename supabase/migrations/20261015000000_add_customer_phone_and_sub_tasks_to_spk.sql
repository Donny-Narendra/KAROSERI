-- Migration: Add customer_phone and sub_tasks to spk table
-- Description: Supports customer phone number and modification scope / sub tasks array for SPK registration and WBS tracking

ALTER TABLE public.spk 
ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(30),
ADD COLUMN IF NOT EXISTS sub_tasks TEXT[];

-- Optional compatibility for spk_orders if exists in any legacy/alternative schema
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spk_orders') THEN
    ALTER TABLE public.spk_orders 
    ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(30),
    ADD COLUMN IF NOT EXISTS sub_tasks TEXT[];
  END IF;
END $$;
