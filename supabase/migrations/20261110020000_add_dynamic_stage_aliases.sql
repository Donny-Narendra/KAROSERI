-- 1. Tambahkan kolom stage_aliases pada workshop_settings untuk menyimpan penamaan kustom
ALTER TABLE public.workshop_settings 
ADD COLUMN IF NOT EXISTS stage_aliases jsonb DEFAULT '{
  "1": "Pembongkaran",
  "2": "Sasis/Rangka",
  "3": "Dinding/Fabrikasi",
  "4": "Pengecatan",
  "5": "Kelistrikan/Hidrolik"
}'::jsonb;

-- 2. Pastikan record default (id = 1) terisi
UPDATE public.workshop_settings
SET stage_aliases = '{
  "1": "Pembongkaran",
  "2": "Sasis/Rangka",
  "3": "Dinding/Fabrikasi",
  "4": "Pengecatan",
  "5": "Kelistrikan/Hidrolik"
}'::jsonb
WHERE id = 1 AND (stage_aliases IS NULL OR stage_aliases = '{}'::jsonb);

-- 3. Pastikan indeks performa untuk filter SPK tersedia
CREATE INDEX IF NOT EXISTS idx_spk_isolation ON public.spk (is_hidden, is_test);

-- 4. Pastikan anon/publik dapat membaca workshop_settings untuk pelacakan publik
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'workshop_settings' AND policyname = 'Settings are viewable by anon.'
  ) THEN
    CREATE POLICY "Settings are viewable by anon."
      ON public.workshop_settings FOR SELECT
      TO anon
      USING ( true );
  END IF;
END $$;
