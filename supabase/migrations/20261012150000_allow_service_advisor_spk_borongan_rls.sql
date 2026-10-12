-- Migration: 20261012150000_allow_service_advisor_spk_borongan_rls.sql
-- Description: Update RLS policies on public.spk_borongan to grant SELECT, INSERT, UPDATE, DELETE 
-- access to service_advisor, alongside petugas_gudang, mandor, owner, and admin.

-- Pastikan RLS aktif pada tabel spk_borongan
ALTER TABLE public.spk_borongan ENABLE ROW LEVEL SECURITY;

-- 1. Bersihkan policy lama agar tidak terjadi konflik atau duplikasi
DROP POLICY IF EXISTS "Owners have full access to spk_borongan" ON public.spk_borongan;
DROP POLICY IF EXISTS "Mandor can manage spk_borongan" ON public.spk_borongan;
DROP POLICY IF EXISTS "Allow insert spk_borongan for authorized staff" ON public.spk_borongan;
DROP POLICY IF EXISTS "Allow select spk_borongan for authorized staff" ON public.spk_borongan;
DROP POLICY IF EXISTS "Allow update spk_borongan for authorized staff" ON public.spk_borongan;
DROP POLICY IF EXISTS "Allow delete spk_borongan for authorized staff" ON public.spk_borongan;
DROP POLICY IF EXISTS "Allow update delete spk_borongan for authorized staff" ON public.spk_borongan;
DROP POLICY IF EXISTS "Allow all spk_borongan for authorized staff" ON public.spk_borongan;

-- 2. Hak akses SELECT: service_advisor, petugas_gudang, mandor, owner, admin
CREATE POLICY "Allow select spk_borongan for authorized staff"
ON public.spk_borongan
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' IN ('service_advisor', 'petugas_gudang', 'mandor', 'owner', 'admin')
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('service_advisor', 'petugas_gudang', 'mandor', 'owner', 'admin')
  )
);

-- 3. Hak akses INSERT: service_advisor, petugas_gudang, mandor, owner, admin
CREATE POLICY "Allow insert spk_borongan for authorized staff"
ON public.spk_borongan
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' IN ('service_advisor', 'petugas_gudang', 'mandor', 'owner', 'admin')
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('service_advisor', 'petugas_gudang', 'mandor', 'owner', 'admin')
  )
);

-- 4. Hak akses UPDATE: service_advisor, petugas_gudang, mandor, owner, admin
CREATE POLICY "Allow update spk_borongan for authorized staff"
ON public.spk_borongan
FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'role' IN ('service_advisor', 'petugas_gudang', 'mandor', 'owner', 'admin')
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('service_advisor', 'petugas_gudang', 'mandor', 'owner', 'admin')
  )
)
WITH CHECK (
  auth.jwt() ->> 'role' IN ('service_advisor', 'petugas_gudang', 'mandor', 'owner', 'admin')
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('service_advisor', 'petugas_gudang', 'mandor', 'owner', 'admin')
  )
);

-- 5. Hak akses DELETE: service_advisor, petugas_gudang, mandor, owner, admin
CREATE POLICY "Allow delete spk_borongan for authorized staff"
ON public.spk_borongan
FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'role' IN ('service_advisor', 'petugas_gudang', 'mandor', 'owner', 'admin')
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('service_advisor', 'petugas_gudang', 'mandor', 'owner', 'admin')
  )
);
