DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'spk_borongan' 
      AND column_name = 'deadline_date'
  ) THEN
    ALTER TABLE public.spk_borongan ADD COLUMN deadline_date DATE;
  END IF;
END $$;
