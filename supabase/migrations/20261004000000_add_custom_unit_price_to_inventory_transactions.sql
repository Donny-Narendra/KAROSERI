-- Add custom_unit_price to inventory_transactions
ALTER TABLE public.inventory_transactions 
ADD COLUMN IF NOT EXISTS custom_unit_price numeric DEFAULT NULL;

-- Berikan akses UPDATE, DELETE kepada Petugas Gudang dan Admin untuk tabel inventory_transactions
CREATE POLICY "Petugas Gudang can update inventory_transactions" ON public.inventory_transactions FOR UPDATE USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'petugas_gudang' );
CREATE POLICY "Petugas Gudang can delete inventory_transactions" ON public.inventory_transactions FOR DELETE USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'petugas_gudang' );

CREATE POLICY "Admin can insert inventory_transactions" ON public.inventory_transactions FOR INSERT WITH CHECK ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' );
CREATE POLICY "Admin can update inventory_transactions" ON public.inventory_transactions FOR UPDATE USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' );
CREATE POLICY "Admin can delete inventory_transactions" ON public.inventory_transactions FOR DELETE USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' );
