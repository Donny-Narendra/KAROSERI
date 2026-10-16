-- ============================================================================
-- Migrasi: Enable Warehouse Operations on Service Advisor Portal with Audit Logging
-- File: supabase/migrations/20261016000000_enable_sa_warehouse_ops_audit.sql
-- ============================================================================

-- 1. Tambah kolom audit pada inventory_transactions (Goods Issue & Return)
ALTER TABLE public.inventory_transactions
ADD COLUMN IF NOT EXISTS issued_by_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS issued_by_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS issued_by_role VARCHAR(50),
ADD COLUMN IF NOT EXISTS audit_notes TEXT,
ADD COLUMN IF NOT EXISTS processed_by_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS processed_by_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS processed_by_role VARCHAR(50);

-- Backfill issued_by_user_id dari issued_by jika belum terisi
UPDATE public.inventory_transactions it
SET 
  issued_by_user_id = COALESCE(it.issued_by_user_id, it.issued_by),
  issued_by_name = COALESCE(it.issued_by_name, p.full_name),
  issued_by_role = COALESCE(it.issued_by_role, p.role::text)
FROM public.profiles p
WHERE it.issued_by = p.id AND (it.issued_by_name IS NULL OR it.issued_by_user_id IS NULL);

-- 2. Tambah kolom audit pada material_requisitions (Approval Permintaan Mandor)
ALTER TABLE public.material_requisitions
ADD COLUMN IF NOT EXISTS approved_by_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_by_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS approved_by_role VARCHAR(50),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS audit_notes TEXT;

-- 3. Buat tabel penampung/spesifikasi eksplisit jika dibutuhkan untuk kompatibilitas skrip/kueri mandiri
CREATE TABLE IF NOT EXISTS public.material_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spk_id UUID REFERENCES public.spk(id) ON DELETE CASCADE,
  material_id UUID REFERENCES public.materials(id),
  quantity NUMERIC NOT NULL DEFAULT 0,
  issued_by_user_id UUID REFERENCES auth.users(id),
  issued_by_name VARCHAR(100),
  issued_by_role VARCHAR(50),
  audit_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.material_issues
ADD COLUMN IF NOT EXISTS issued_by_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS issued_by_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS issued_by_role VARCHAR(50),
ADD COLUMN IF NOT EXISTS audit_notes TEXT;

CREATE TABLE IF NOT EXISTS public.mandor_requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spk_id UUID REFERENCES public.spk(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES auth.users(id),
  status VARCHAR(50) DEFAULT 'PENDING',
  approved_by_user_id UUID REFERENCES auth.users(id),
  approved_by_name VARCHAR(100),
  approved_by_role VARCHAR(50),
  approved_at TIMESTAMPTZ,
  audit_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.mandor_requisitions
ADD COLUMN IF NOT EXISTS approved_by_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_by_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS approved_by_role VARCHAR(50),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.material_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spk_id UUID REFERENCES public.spk(id) ON DELETE CASCADE,
  material_id UUID REFERENCES public.materials(id),
  quantity NUMERIC NOT NULL DEFAULT 0,
  processed_by_user_id UUID REFERENCES auth.users(id),
  processed_by_name VARCHAR(100),
  processed_by_role VARCHAR(50),
  audit_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.material_returns
ADD COLUMN IF NOT EXISTS processed_by_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS processed_by_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS processed_by_role VARCHAR(50);

-- Enable RLS untuk tabel-tabel baru
ALTER TABLE public.material_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mandor_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_returns ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow all authenticated users access to material_issues"
  ON public.material_issues FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow all authenticated users access to mandor_requisitions"
  ON public.mandor_requisitions FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow all authenticated users access to material_returns"
  ON public.material_returns FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Sinkronisasi RLS pada inventory_transactions untuk Service Advisor (Backup Role)
DO $$ BEGIN
  CREATE POLICY "Service Advisor can read inventory_transactions"
  ON public.inventory_transactions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('service_advisor'::user_role, 'petugas_gudang'::user_role, 'owner'::user_role, 'kasir'::user_role)
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service Advisor can insert inventory_transactions"
  ON public.inventory_transactions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('service_advisor'::user_role, 'petugas_gudang'::user_role, 'owner'::user_role)
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service Advisor can update inventory_transactions"
  ON public.inventory_transactions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('service_advisor'::user_role, 'petugas_gudang'::user_role, 'owner'::user_role)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('service_advisor'::user_role, 'petugas_gudang'::user_role, 'owner'::user_role)
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. Izinkan Service Advisor mengupdate stok fisik materials saat melakukan pengeluaran/retur barang
DO $$ BEGIN
  CREATE POLICY "Service Advisor can update materials stock"
  ON public.materials FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('service_advisor'::user_role, 'petugas_gudang'::user_role, 'owner'::user_role)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('service_advisor'::user_role, 'petugas_gudang'::user_role, 'owner'::user_role)
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
