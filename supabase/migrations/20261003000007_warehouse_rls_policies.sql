-- Berikan akses SELECT kepada Petugas Gudang untuk membaca tabel SPK, Materials, RAB Estimations, dan RAB Items
CREATE POLICY "Petugas Gudang can read spk" ON public.spk FOR SELECT USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'petugas_gudang' );

CREATE POLICY "Petugas Gudang can read materials" ON public.materials FOR SELECT USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'petugas_gudang' );

CREATE POLICY "Petugas Gudang can read rab_estimations" ON public.rab_estimations FOR SELECT USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'petugas_gudang' );

CREATE POLICY "Petugas Gudang can read rab_items" ON public.rab_items FOR SELECT USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'petugas_gudang' );
