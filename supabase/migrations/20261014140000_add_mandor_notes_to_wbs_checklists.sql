-- Migration: Add mandor_notes column and ensure public tracking RLS for wbs_checklists
-- Phase 66: Integrasi Tampilan Mandor Notes pada Kartu WBS di Portal Pelanggan (/tracking/:spk_no)

-- 1. Tambahkan kolom mandor_notes jika belum ada di tabel wbs_checklists
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'wbs_checklists' 
      AND column_name = 'mandor_notes'
  ) THEN 
    ALTER TABLE public.wbs_checklists ADD COLUMN mandor_notes TEXT;
  END IF; 
END $$;

-- Sinkronisasi catatan yang sudah ada di kolom notes ke mandor_notes (jika ada)
UPDATE public.wbs_checklists 
SET mandor_notes = notes 
WHERE mandor_notes IS NULL AND notes IS NOT NULL;

-- 2. Pastikan RLS mengizinkan pembacaan publik/anonim untuk pelacakan SPK & WBS
DROP POLICY IF EXISTS "Allow public read wbs_checklists for tracking" ON public.wbs_checklists;
DROP POLICY IF EXISTS "Allow public read spk_wbs for tracking" ON public.wbs_checklists;

CREATE POLICY "Allow public read wbs_checklists for tracking"
ON public.wbs_checklists
FOR SELECT
TO anon, authenticated
USING (true);
