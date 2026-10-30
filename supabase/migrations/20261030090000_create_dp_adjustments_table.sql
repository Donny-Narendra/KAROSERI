-- ==============================================================================
-- MIGRATION: 20261030090000_create_dp_adjustments_table.sql
-- Description: Tabel Immutable Audit Trail Koreksi Nilai Uang Muka (DP)
-- ==============================================================================

-- 1. Pastikan kolom down_payment_amount tersedia di tabel spk jika belum ada
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'spk' 
    AND column_name = 'down_payment_amount'
  ) THEN 
    ALTER TABLE public.spk ADD COLUMN down_payment_amount NUMERIC(15,2);
    UPDATE public.spk SET down_payment_amount = dp_amount WHERE dp_amount IS NOT NULL;
  END IF; 
END $$;

-- 2. Buat tabel untuk mencatat riwayat koreksi kesalahan input DP (Immutable Audit Trail)
CREATE TABLE IF NOT EXISTS public.dp_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spk_id UUID NOT NULL REFERENCES public.spk(id) ON DELETE CASCADE,
  spk_no TEXT NOT NULL,
  old_amount NUMERIC(15, 2) NOT NULL,
  new_amount NUMERIC(15, 2) NOT NULL,
  difference NUMERIC(15, 2) NOT NULL,
  reason TEXT NOT NULL,
  adjusted_by_user_id UUID,
  adjusted_by_name TEXT NOT NULL,
  adjusted_by_role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexing untuk pencarian cepat berdasarkan spk_id dan spk_no
CREATE INDEX IF NOT EXISTS idx_dp_adjustments_spk_id ON public.dp_adjustments(spk_id);
CREATE INDEX IF NOT EXISTS idx_dp_adjustments_spk_no ON public.dp_adjustments(spk_no);
CREATE INDEX IF NOT EXISTS idx_dp_adjustments_created_at ON public.dp_adjustments(created_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.dp_adjustments ENABLE ROW LEVEL SECURITY;

-- 5. Kebijakan Keamanan RLS: Memungkinkan staf kasir & authenticated user membaca dan menyisipkan log audit
DO $$ BEGIN
  CREATE POLICY "Allow read access to dp_adjustments" 
  ON public.dp_adjustments FOR SELECT 
  TO authenticated, anon 
  USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow insert access to dp_adjustments" 
  ON public.dp_adjustments FOR INSERT 
  TO authenticated, anon 
  WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
