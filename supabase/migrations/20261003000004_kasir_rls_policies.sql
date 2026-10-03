-- Berikan akses SELECT kepada Kasir untuk membaca tabel SPK
DO $$ BEGIN
  CREATE POLICY "Kasir can read spk" ON public.spk FOR SELECT USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'kasir' );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Berikan akses UPDATE kepada Kasir untuk memperbarui status dan dp_amount di tabel SPK
DO $$ BEGIN
  CREATE POLICY "Kasir can update spk" ON public.spk FOR UPDATE USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'kasir' );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Berikan akses kepada Kasir untuk membaca tabel-tabel relasi saat fetch data di KasirDashboard
DO $$ BEGIN
  CREATE POLICY "Kasir can read rab_estimations" ON public.rab_estimations FOR SELECT USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'kasir' );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Kasir can read inventory_transactions" ON public.inventory_transactions FOR SELECT USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'kasir' );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Kasir can read materials" ON public.materials FOR SELECT USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'kasir' );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
