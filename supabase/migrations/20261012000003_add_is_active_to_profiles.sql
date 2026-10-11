-- Migration: Add is_active column to profiles for staff deactivation/access management
-- Date: 2026-10-12
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

COMMENT ON COLUMN public.profiles.is_active IS 'Menandakan status aktif/nonaktif akses staf karoseri';
