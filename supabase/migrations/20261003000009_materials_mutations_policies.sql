-- Berikan akses INSERT, UPDATE, DELETE kepada Petugas Gudang dan Admin untuk tabel materials
CREATE POLICY "Petugas Gudang can insert materials" ON public.materials FOR INSERT WITH CHECK ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'petugas_gudang' );
CREATE POLICY "Petugas Gudang can update materials" ON public.materials FOR UPDATE USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'petugas_gudang' );
CREATE POLICY "Petugas Gudang can delete materials" ON public.materials FOR DELETE USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'petugas_gudang' );

CREATE POLICY "Admin can insert materials" ON public.materials FOR INSERT WITH CHECK ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' );
CREATE POLICY "Admin can update materials" ON public.materials FOR UPDATE USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' );
CREATE POLICY "Admin can delete materials" ON public.materials FOR DELETE USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' );
