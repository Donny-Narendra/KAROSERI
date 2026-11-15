DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'materials'
      AND policyname = 'Allow authenticated to read materials'
  ) THEN
    CREATE POLICY "Allow authenticated to read materials"
      ON public.materials
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END
$$;
