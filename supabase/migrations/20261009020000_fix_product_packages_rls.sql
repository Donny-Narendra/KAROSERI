-- Membuka akses baca tabel product_packages untuk semua user yang login (authenticated)
-- Karena tabel ini bersifat master data / katalog, aman untuk dibaca oleh role apapun (kasir, admin, dsb)

ALTER TABLE public.product_packages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow authenticated to read product_packages" ON public.product_packages 
  FOR SELECT 
  TO authenticated 
  USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Pastikan policy lama tidak bentrok atau membatasi (meski policy bersifat OR, ini untuk memastikan clean state)
-- (Opsional: DROP POLICY IF EXISTS "Kasir can read product_packages" ON public.product_packages;)
