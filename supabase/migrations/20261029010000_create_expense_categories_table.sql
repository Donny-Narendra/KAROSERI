-- ==============================================================================
-- MIGRATION: 20261029010000_create_expense_categories_table.sql
-- Description: Master Dinamis Kategori Beban Operasional (OPEX)
-- ==============================================================================

-- 1. Buat tabel master expense_categories
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Seeding kategori bawaan awal
INSERT INTO public.expense_categories (name, description)
VALUES 
  ('Amortisasi Sewa Tempat & Gedung', 'Biaya amortisasi sewa bengkel & gedung'),
  ('Gaji & Tunjangan Staf Tetap', 'Gaji bulanan staf tetap non-borongan'),
  ('Kebersihan & Keamanan (Amenities)', 'Iuran keamanan, kebersihan lingkungan, air'),
  ('Pemeliharaan Alat & Mesin Fasilitas', 'Servis mesin kompresor, las, alat hidrolik pabrik'),
  ('Token Listrik & Utilitas Bengkel', 'Pembelian token PLN dan tagihan air PDAM pabrik'),
  ('Lain-lain / Tak Terduga', 'Beban operasional ad-hoc insidental')
ON CONFLICT (name) DO NOTHING;

-- 3. Pastikan tabel opex_expenses dan operating_expenses memiliki kolom category_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'opex_expenses'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opex_expenses' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE public.opex_expenses ADD COLUMN category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'operating_expenses'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'operating_expenses' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE public.operating_expenses ADD COLUMN category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Keamanan RLS & Akses Izin
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full expense_categories" ON public.expense_categories;
CREATE POLICY "Allow authenticated full expense_categories" ON public.expense_categories 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon read expense_categories" ON public.expense_categories;
CREATE POLICY "Allow anon read expense_categories" ON public.expense_categories 
  FOR SELECT TO anon USING (true);

GRANT ALL ON public.expense_categories TO authenticated;
GRANT SELECT ON public.expense_categories TO anon;
