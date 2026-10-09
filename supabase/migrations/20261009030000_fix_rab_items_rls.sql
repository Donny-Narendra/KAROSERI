-- Memperbaiki RLS rab_items dan spk_amendments agar kasir bisa membacanya tanpa terhalang strict role check

ALTER TABLE public.rab_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spk_amendments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow authenticated to read rab_items" ON public.rab_items 
  FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow authenticated to read spk_amendments" ON public.spk_amendments 
  FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
