-- ==============================================================================
-- Migration: 20261023040000_add_package_instance_to_change_order_items.sql
-- Description: Add package_source_id, package_instance_id, and package_name to change_order_items
-- ==============================================================================

ALTER TABLE public.change_order_items
ADD COLUMN IF NOT EXISTS package_source_id UUID REFERENCES public.product_packages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS package_instance_id UUID,
ADD COLUMN IF NOT EXISTS package_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_change_order_items_package_instance
ON public.change_order_items(package_instance_id);

CREATE INDEX IF NOT EXISTS idx_change_order_items_package_source
ON public.change_order_items(package_source_id);
