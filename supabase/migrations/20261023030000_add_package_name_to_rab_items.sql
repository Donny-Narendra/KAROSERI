-- ==============================================================================
-- MIGRATION: 20261023030000_add_package_name_to_rab_items.sql
-- Description: Add package_name column to rab_items and backfill historical package names
-- ==============================================================================

ALTER TABLE public.rab_items 
ADD COLUMN IF NOT EXISTS package_name TEXT;

-- Backfill package_name dari product_packages untuk baris yang memiliki package_id
UPDATE public.rab_items ri
SET package_name = pp.name
FROM public.product_packages pp
WHERE ri.package_id = pp.id
  AND (ri.package_name IS NULL OR ri.package_name = '');
