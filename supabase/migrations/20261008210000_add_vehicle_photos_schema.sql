ALTER TABLE public.spk ADD COLUMN IF NOT EXISTS vehicle_photos jsonb DEFAULT '[]'::jsonb;
