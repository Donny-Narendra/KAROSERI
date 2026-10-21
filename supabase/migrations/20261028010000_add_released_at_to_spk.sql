-- Migration: Add released_at to spk table for 7-day post-BAST tracking expiration
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'spk' AND column_name = 'released_at'
  ) THEN
    ALTER TABLE public.spk ADD COLUMN released_at TIMESTAMPTZ;
  END IF;
END $$;

-- Optional index to accelerate queries filtering or sorting by release date
CREATE INDEX IF NOT EXISTS idx_spk_released_at ON public.spk(released_at);
