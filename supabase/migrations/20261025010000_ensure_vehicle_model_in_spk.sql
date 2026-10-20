-- Migration: 20261025010000_ensure_vehicle_model_in_spk.sql
-- Description: Pastikan kolom vehicle_model dan vehicle_brand tersedia di tabel spk

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'spk' 
      AND column_name = 'vehicle_model'
  ) THEN
    ALTER TABLE public.spk ADD COLUMN vehicle_model TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'spk' 
      AND column_name = 'vehicle_brand'
  ) THEN
    ALTER TABLE public.spk ADD COLUMN vehicle_brand TEXT;
  END IF;
END $$;

-- Reload schema cache Supabase / PostgREST
NOTIFY pgrst, 'reload schema';
