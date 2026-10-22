-- Migration: 20261023010000_add_source_type_to_requisition_items.sql
-- Description: Add source_type and package_name columns to material_requisition_items and inventory_transactions to support audit origins and avoid 42703 schema errors.

ALTER TABLE public.material_requisition_items 
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'RAB';

ALTER TABLE public.material_requisition_items 
ADD COLUMN IF NOT EXISTS package_name TEXT;

DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory_transactions') THEN 
    ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'RAB'; 
    ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS package_name TEXT; 
    ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS change_order_id UUID REFERENCES public.change_orders(id) ON DELETE SET NULL;
  END IF; 
END $$;
