-- supabase/migrations/20261029030000_add_agreement_photos_to_spk.sql
ALTER TABLE public.spk 
ADD COLUMN IF NOT EXISTS agreement_photos JSONB DEFAULT '[]'::jsonb;

