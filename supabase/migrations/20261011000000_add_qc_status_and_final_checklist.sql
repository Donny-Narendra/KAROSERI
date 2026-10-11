-- 1. Tambahkan kolom qc_status ke tabel spk
ALTER TABLE public.spk 
ADD COLUMN IF NOT EXISTS qc_status text NOT NULL DEFAULT 'PENDING' 
CHECK (qc_status IN ('PENDING', 'PASS', 'FAIL'));

-- 2. Tambahkan kolom jsonb untuk menyimpan detail centang Final QC
ALTER TABLE public.spk 
ADD COLUMN IF NOT EXISTS final_qc_checklist jsonb DEFAULT '[]'::jsonb;

-- 3. Pastikan RLS mengizinkan role mandor dan kasir untuk membaca dan memperbarui kolom ini pada tabel public.spk
DO $$ BEGIN
  CREATE POLICY "Mandor can update spk" ON public.spk FOR UPDATE 
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'mandor' );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Kasir can update spk" ON public.spk FOR UPDATE 
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'kasir' );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Mandor can read spk" ON public.spk FOR SELECT 
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'mandor' );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Kasir can read spk" ON public.spk FOR SELECT 
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'kasir' );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Set SPK-9846 menjadi PASS untuk pengujian langsung jika record ada
UPDATE public.spk 
SET qc_status = 'PASS' 
WHERE spk_no = 'SPK-9846';
