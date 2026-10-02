-- Migration Script for Workshop Settings & User Management
-- ==============================================================================

-- 1. Add quick_pin to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS quick_pin text;

-- 2. Create workshop_settings table
CREATE TABLE IF NOT EXISTS public.workshop_settings (
    id int PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Ensure only one row
    currency text NOT NULL DEFAULT 'IDR - Rp',
    rounding_precision text NOT NULL DEFAULT 'no_decimal',
    default_language text NOT NULL DEFAULT 'id',
    bay_hourly_rate numeric NOT NULL DEFAULT 0,
    default_waste_factor numeric NOT NULL DEFAULT 0,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert initial row if not exists
INSERT INTO public.workshop_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 3. Row Level Security (RLS) for workshop_settings
ALTER TABLE public.workshop_settings ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Settings are viewable by everyone." ON public.workshop_settings;
  DROP POLICY IF EXISTS "Only owner can update settings." ON public.workshop_settings;
  DROP POLICY IF EXISTS "Only owner can insert settings." ON public.workshop_settings;
END $$;

CREATE POLICY "Settings are viewable by everyone."
  ON public.workshop_settings FOR SELECT
  USING ( auth.role() = 'authenticated' );

CREATE POLICY "Only owner can update settings."
  ON public.workshop_settings FOR UPDATE
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' );

CREATE POLICY "Only owner can insert settings."
  ON public.workshop_settings FOR INSERT
  WITH CHECK ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' );
