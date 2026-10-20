-- Migration: 20261023020000_remove_waste_factor.sql
-- Description: Deprecate waste_factor and waste_factor_percentage columns in rab_items by making them nullable with default 0, and reload PostgREST schema cache.

-- 1. Set nilai default 0 dan jadikan nullable agar aman dari kode warisan
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rab_items' AND column_name = 'waste_factor') THEN
    ALTER TABLE public.rab_items ALTER COLUMN waste_factor DROP NOT NULL;
    ALTER TABLE public.rab_items ALTER COLUMN waste_factor SET DEFAULT 0;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rab_items' AND column_name = 'waste_factor_percentage') THEN
    ALTER TABLE public.rab_items ALTER COLUMN waste_factor_percentage DROP NOT NULL;
    ALTER TABLE public.rab_items ALTER COLUMN waste_factor_percentage SET DEFAULT 0;
  END IF;
END $$;

-- 2. Reload schema cache Supabase / PostgREST
NOTIFY pgrst, 'reload schema';
