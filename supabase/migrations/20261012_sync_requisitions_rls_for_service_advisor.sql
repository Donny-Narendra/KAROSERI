-- ============================================================================
-- MIGRASI RLS: SINKRONISASI AKSES REQUISITION UNTUK SERVICE ADVISOR & MANDOR
-- File: supabase/migrations/20261012_sync_requisitions_rls_for_service_advisor.sql
-- Keterangan: Membuka hak akses SELECT, INSERT, UPDATE, dan DELETE pada tabel
--             material_requisitions dan material_requisition_items bagi peran
--             service_advisor bersama mandor, petugas_gudang, owner, dan admin.
-- ============================================================================

-- 1. Pastikan Row Level Security aktif pada kedua tabel requisition
ALTER TABLE public.material_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_requisition_items ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- TABEL: public.material_requisitions
-- ----------------------------------------------------------------------------

-- Bersihkan policy lama agar tidak terjadi konflik atau filter restriktif sepihak
DROP POLICY IF EXISTS "Owners have full access to material_requisitions" ON public.material_requisitions;
DROP POLICY IF EXISTS "Mandor can manage material_requisitions" ON public.material_requisitions;
DROP POLICY IF EXISTS "Gudang can manage material_requisitions" ON public.material_requisitions;
DROP POLICY IF EXISTS "Allow select material_requisitions for authorized staff" ON public.material_requisitions;
DROP POLICY IF EXISTS "Allow insert material_requisitions for authorized staff" ON public.material_requisitions;
DROP POLICY IF EXISTS "Allow update delete material_requisitions for authorized staff" ON public.material_requisitions;
DROP POLICY IF EXISTS "Allow update material_requisitions for authorized staff" ON public.material_requisitions;
DROP POLICY IF EXISTS "Allow delete material_requisitions for authorized staff" ON public.material_requisitions;
DROP POLICY IF EXISTS "Allow all material_requisitions for authorized staff" ON public.material_requisitions;

-- A. Policy SELECT: Mengizinkan Service Advisor, Mandor, Gudang, Owner, dan Admin membaca seluruh data permintaan aktif
CREATE POLICY "Allow select material_requisitions for authorized staff"
ON public.material_requisitions
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' IN ('service_advisor', 'mandor', 'petugas_gudang', 'owner', 'admin')
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('service_advisor', 'mandor', 'petugas_gudang', 'owner', 'admin')
  )
);

-- B. Policy INSERT: Mengizinkan Service Advisor, Mandor, Gudang, Owner, dan Admin membuat permintaan material
CREATE POLICY "Allow insert material_requisitions for authorized staff"
ON public.material_requisitions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' IN ('service_advisor', 'mandor', 'petugas_gudang', 'owner', 'admin')
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('service_advisor', 'mandor', 'petugas_gudang', 'owner', 'admin')
  )
);

-- C. Policy UPDATE: Mengizinkan staf berwenang memperbarui status/catatan permintaan
CREATE POLICY "Allow update material_requisitions for authorized staff"
ON public.material_requisitions
FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'role' IN ('service_advisor', 'mandor', 'petugas_gudang', 'owner', 'admin')
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('service_advisor', 'mandor', 'petugas_gudang', 'owner', 'admin')
  )
)
WITH CHECK (
  auth.jwt() ->> 'role' IN ('service_advisor', 'mandor', 'petugas_gudang', 'owner', 'admin')
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('service_advisor', 'mandor', 'petugas_gudang', 'owner', 'admin')
  )
);

-- D. Policy DELETE: Mengizinkan staf berwenang membatalkan / menghapus permintaan material
CREATE POLICY "Allow delete material_requisitions for authorized staff"
ON public.material_requisitions
FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'role' IN ('service_advisor', 'mandor', 'petugas_gudang', 'owner', 'admin')
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('service_advisor', 'mandor', 'petugas_gudang', 'owner', 'admin')
  )
);

-- ----------------------------------------------------------------------------
-- TABEL: public.material_requisition_items
-- ----------------------------------------------------------------------------

-- Bersihkan policy lama pada tabel detail items
DROP POLICY IF EXISTS "Owners have full access to material_requisition_items" ON public.material_requisition_items;
DROP POLICY IF EXISTS "Mandor can manage material_requisition_items" ON public.material_requisition_items;
DROP POLICY IF EXISTS "Gudang can manage material_requisition_items" ON public.material_requisition_items;
DROP POLICY IF EXISTS "Allow select material_requisition_items for authorized staff" ON public.material_requisition_items;
DROP POLICY IF EXISTS "Allow insert material_requisition_items for authorized staff" ON public.material_requisition_items;
DROP POLICY IF EXISTS "Allow update delete material_requisition_items for authorized staff" ON public.material_requisition_items;
DROP POLICY IF EXISTS "Allow update material_requisition_items for authorized staff" ON public.material_requisition_items;
DROP POLICY IF EXISTS "Allow delete material_requisition_items for authorized staff" ON public.material_requisition_items;
DROP POLICY IF EXISTS "Allow all material_requisition_items for authorized staff" ON public.material_requisition_items;

-- A. Policy SELECT
CREATE POLICY "Allow select material_requisition_items for authorized staff"
ON public.material_requisition_items
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' IN ('service_advisor', 'mandor', 'petugas_gudang', 'owner', 'admin')
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('service_advisor', 'mandor', 'petugas_gudang', 'owner', 'admin')
  )
);

-- B. Policy INSERT
CREATE POLICY "Allow insert material_requisition_items for authorized staff"
ON public.material_requisition_items
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' IN ('service_advisor', 'mandor', 'petugas_gudang', 'owner', 'admin')
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('service_advisor', 'mandor', 'petugas_gudang', 'owner', 'admin')
  )
);

-- C. Policy UPDATE
CREATE POLICY "Allow update material_requisition_items for authorized staff"
ON public.material_requisition_items
FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'role' IN ('service_advisor', 'mandor', 'petugas_gudang', 'owner', 'admin')
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('service_advisor', 'mandor', 'petugas_gudang', 'owner', 'admin')
  )
)
WITH CHECK (
  auth.jwt() ->> 'role' IN ('service_advisor', 'mandor', 'petugas_gudang', 'owner', 'admin')
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('service_advisor', 'mandor', 'petugas_gudang', 'owner', 'admin')
  )
);

-- D. Policy DELETE
CREATE POLICY "Allow delete material_requisition_items for authorized staff"
ON public.material_requisition_items
FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'role' IN ('service_advisor', 'mandor', 'petugas_gudang', 'owner', 'admin')
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('service_advisor', 'mandor', 'petugas_gudang', 'owner', 'admin')
  )
);
