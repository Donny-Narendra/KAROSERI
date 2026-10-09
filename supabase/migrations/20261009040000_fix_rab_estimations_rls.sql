-- Memperbaiki RLS rab_estimations yang memblokir Kasir untuk membacanya

ALTER TABLE public.rab_estimations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow authenticated to read rab_estimations" ON public.rab_estimations 
  FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
