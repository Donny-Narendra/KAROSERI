-- Berikan akses SELECT kepada Kasir untuk membaca tabel rab_items
DO $$ BEGIN
  CREATE POLICY "Kasir can read rab_items" ON public.rab_items FOR SELECT USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'kasir' );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Berikan akses SELECT kepada Kasir untuk membaca tabel spk_amendments
DO $$ BEGIN
  CREATE POLICY "Kasir can read spk_amendments" ON public.spk_amendments FOR SELECT USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'kasir' );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Berikan akses SELECT kepada Kasir untuk membaca tabel product_packages
DO $$ BEGIN
  CREATE POLICY "Kasir can read product_packages" ON public.product_packages FOR SELECT USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'kasir' );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
