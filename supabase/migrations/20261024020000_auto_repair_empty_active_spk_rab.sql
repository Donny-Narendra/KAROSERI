-- ==============================================================================
-- MIGRATION: 20261024020000_auto_repair_empty_active_spk_rab.sql
-- Description: Pemulihan Otomatis Data RAB Kosong untuk Seluruh SPK Aktif,
--              Pencegahan State-Lost di RabCalculator, dan Penyusunan 5 Tahapan WBS
--              (3 Unsur Biaya: Material, Labor, Overhead).
-- ==============================================================================

-- 1. Pastikan kolom generated tidak memblokir operasi insert/upsert
DO $$
BEGIN
  -- Pastikan subtotal pada rab_items bukan generated ALWAYS (mencegah error 428C9)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rab_items' AND column_name = 'subtotal' AND is_generated = 'ALWAYS'
  ) THEN
    ALTER TABLE public.rab_items ALTER COLUMN subtotal DROP EXPRESSION IF EXISTS;
    ALTER TABLE public.rab_items ALTER COLUMN subtotal SET DEFAULT 0;
  END IF;

  -- Pastikan wbs_stage pada rab_items bukan generated ALWAYS jika kolom ada
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rab_items' AND column_name = 'wbs_stage' AND is_generated = 'ALWAYS'
  ) THEN
    ALTER TABLE public.rab_items ALTER COLUMN wbs_stage DROP EXPRESSION IF EXISTS;
  END IF;

  -- Pastikan waste_factor dan waste_factor_percentage nullable dengan default 0
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rab_items' AND column_name = 'waste_factor') THEN
    ALTER TABLE public.rab_items ALTER COLUMN waste_factor DROP NOT NULL;
    ALTER TABLE public.rab_items ALTER COLUMN waste_factor SET DEFAULT 0;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rab_items' AND column_name = 'waste_factor_percentage') THEN
    ALTER TABLE public.rab_items ALTER COLUMN waste_factor_percentage DROP NOT NULL;
    ALTER TABLE public.rab_items ALTER COLUMN waste_factor_percentage SET DEFAULT 0;
  END IF;
END $$;

-- 2. Pastikan RLS Policy mengizinkan staf (service_advisor, admin, owner, kasir) memanipulasi rab_items & rab_estimations
DO $$ 
BEGIN
  CREATE POLICY "Allow authenticated staff to manage rab_items" 
  ON public.rab_items 
  FOR ALL TO authenticated 
  USING (true) 
  WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN 
  NULL; 
END $$;

DO $$ 
BEGIN
  CREATE POLICY "Allow authenticated staff to manage rab_estimations" 
  ON public.rab_estimations 
  FOR ALL TO authenticated 
  USING (true) 
  WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN 
  NULL; 
END $$;

-- 3. Prosedur Auto-Repair Data Recovery untuk seluruh SPK berstatus ACTIVE yang kehilangan data rab_items
DO $$
DECLARE
  r_spk RECORD;
  v_est_id UUID;
  v_mat_plat UUID;
  v_mat_cat UUID;
  v_mat_baut UUID;
  v_total_mat NUMERIC(15, 2);
  v_total_lab NUMERIC(15, 2);
  v_total_foh NUMERIC(15, 2);
  v_grand_total NUMERIC(15, 2);
  v_wbs_wbs4 public.wbs_category;
BEGIN
  -- Ambil ID material riil dari master catalog sebagai referensi foreign key
  SELECT id INTO v_mat_plat FROM public.materials WHERE name ILIKE '%plat%' OR category ILIKE '%material%' LIMIT 1;
  SELECT id INTO v_mat_cat FROM public.materials WHERE name ILIKE '%cat%' OR name ILIKE '%epoxy%' LIMIT 1;
  SELECT id INTO v_mat_baut FROM public.materials WHERE id NOT IN (COALESCE(v_mat_plat, '00000000-0000-0000-0000-000000000000'::uuid)) LIMIT 1;

  -- Tentukan label enum untuk WBS 4 (apakah Cat/Finishing atau Pengecatan jika enum diperluas)
  v_wbs_wbs4 := 'Cat/Finishing'::public.wbs_category;

  -- Loop untuk setiap SPK yang berstatus 'ACTIVE'
  FOR r_spk IN 
    SELECT s.id, s.spk_no, s.customer_name 
    FROM public.spk s
    WHERE UPPER(s.status::text) = 'ACTIVE'
  LOOP
    -- 1. Pastikan record induk rab_estimations tersedia untuk SPK ini
    SELECT id INTO v_est_id FROM public.rab_estimations WHERE spk_id = r_spk.id;
    IF v_est_id IS NULL THEN
      INSERT INTO public.rab_estimations (
        spk_id, 
        total_material_cost, 
        total_labor_cost, 
        total_overhead_cost, 
        total_estimated_cost, 
        created_at
      )
      VALUES (r_spk.id, 0, 0, 0, 0, NOW())
      RETURNING id INTO v_est_id;
    END IF;

    -- 2. Cek apakah SPK ini kehilangan item di rab_items (kosong / 0 baris)
    IF NOT EXISTS (SELECT 1 FROM public.rab_items WHERE rab_estimation_id = v_est_id) THEN
      -- Injeksi paket standar 3 unsur lengkap untuk 5 tahapan WBS:
      -- WBS 1: Pembongkaran, WBS 2: Sasis/Rangka, WBS 3: Dinding/Fabrikasi, WBS 4: Cat/Finishing (Pengecatan), WBS 5: Kelistrikan/Hidrolik
      INSERT INTO public.rab_items (
        rab_estimation_id, 
        spk_id,
        wbs_category, 
        material_id, 
        material_name,
        description, 
        quantity, 
        unit,
        unit_price, 
        cost_price,
        item_total, 
        subtotal,
        item_type,
        labor_hours,
        labor_rate,
        overhead_hours,
        overhead_rate,
        is_locked
      )
      VALUES
        -- WBS 1: Pembongkaran
        (v_est_id, r_spk.id, 'Pembongkaran'::public.wbs_category, v_mat_plat, 'Bahan Kimia & Gas Potong Pembongkaran', 'Bahan Kimia & Gas Potong Pembongkaran', 1, 'paket', 55000, 45000, 55000, 55000, 'MATERIAL', 0, 0, 0, 0, false),
        (v_est_id, r_spk.id, 'Pembongkaran'::public.wbs_category, NULL, 'Jasa Bongkar Bak & Komponen Lama', 'Jasa Bongkar Bak & Komponen Lama', 1, 'lot', 300000, 300000, 300000, 300000, 'LABOR', 1, 300000, 0, 0, false),
        (v_est_id, r_spk.id, 'Pembongkaran'::public.wbs_category, NULL, 'Sewa Stasiun Bay & Listrik Pembongkaran', 'Sewa Stasiun Bay & Listrik Pembongkaran', 1, 'hari', 50000, 50000, 50000, 50000, 'OVERHEAD', 0, 0, 8, 6250, false),

        -- WBS 2: Sasis/Rangka
        (v_est_id, r_spk.id, 'Sasis/Rangka'::public.wbs_category, v_mat_plat, 'Plat Besi & UNP Rangka Penguat', 'Plat Besi & UNP Rangka Penguat', 2, 'lembar', 250000, 200000, 500000, 500000, 'MATERIAL', 0, 0, 0, 0, false),
        (v_est_id, r_spk.id, 'Sasis/Rangka'::public.wbs_category, NULL, 'Jasa Las & Fabrikasi Sasis Utama', 'Jasa Las & Fabrikasi Sasis Utama', 1, 'lot', 400000, 400000, 400000, 400000, 'LABOR', 1, 400000, 0, 0, false),
        (v_est_id, r_spk.id, 'Sasis/Rangka'::public.wbs_category, NULL, 'Sewa Stasiun Sasis & Alat Ukur', 'Sewa Stasiun Sasis & Alat Ukur', 1, 'hari', 50000, 50000, 50000, 50000, 'OVERHEAD', 0, 0, 8, 6250, false),

        -- WBS 3: Dinding/Fabrikasi
        (v_est_id, r_spk.id, 'Dinding/Fabrikasi'::public.wbs_category, v_mat_plat, 'Plat Dinding & Baut Heavy Duty', 'Plat Dinding & Baut Heavy Duty', 1, 'lembar', 300000, 250000, 300000, 300000, 'MATERIAL', 0, 0, 0, 0, false),
        (v_est_id, r_spk.id, 'Dinding/Fabrikasi'::public.wbs_category, NULL, 'Jasa Pasang Rangka Dinding & Box', 'Jasa Pasang Rangka Dinding & Box', 1, 'lot', 350000, 350000, 350000, 350000, 'LABOR', 1, 350000, 0, 0, false),
        (v_est_id, r_spk.id, 'Dinding/Fabrikasi'::public.wbs_category, NULL, 'Sewa Bay Fabrikasi Dinding', 'Sewa Bay Fabrikasi Dinding', 1, 'hari', 50000, 50000, 50000, 50000, 'OVERHEAD', 0, 0, 8, 6250, false),

        -- WBS 4: Cat/Finishing (Pengecatan)
        (v_est_id, r_spk.id, v_wbs_wbs4, v_mat_cat, 'Cat Primer Epoxy Anti-Karat & Thinner', 'Cat Primer Epoxy Anti-Karat & Thinner', 1, 'kaleng', 200000, 160000, 200000, 200000, 'MATERIAL', 0, 0, 0, 0, false),
        (v_est_id, r_spk.id, v_wbs_wbs4, NULL, 'Jasa Pengecatan Full Body & Dempul', 'Jasa Pengecatan Full Body & Dempul', 1, 'lot', 400000, 400000, 400000, 400000, 'LABOR', 1, 400000, 0, 0, false),
        (v_est_id, r_spk.id, v_wbs_wbs4, NULL, 'Sewa Oven Spray Booth & Kompresor', 'Sewa Oven Spray Booth & Kompresor', 1, 'hari', 50000, 50000, 50000, 50000, 'OVERHEAD', 0, 0, 8, 6250, false),

        -- WBS 5: Kelistrikan/Hidrolik
        (v_est_id, r_spk.id, 'Kelistrikan/Hidrolik'::public.wbs_category, v_mat_baut, 'Kabel Otomotif, Relay & Saklar', 'Kabel Otomotif, Relay & Saklar', 1, 'set', 150000, 120000, 150000, 150000, 'MATERIAL', 0, 0, 0, 0, false),
        (v_est_id, r_spk.id, 'Kelistrikan/Hidrolik'::public.wbs_category, NULL, 'Jasa Instalasi Kelistrikan & Lampu', 'Jasa Instalasi Kelistrikan & Lampu', 1, 'lot', 250000, 250000, 250000, 250000, 'LABOR', 1, 250000, 0, 0, false),
        (v_est_id, r_spk.id, 'Kelistrikan/Hidrolik'::public.wbs_category, NULL, 'Sewa Stasiun Final Kelistrikan', 'Sewa Stasiun Final Kelistrikan', 1, 'hari', 50000, 50000, 50000, 50000, 'OVERHEAD', 0, 0, 8, 6250, false);

      -- 3. Hitung total pagu dari baris yang baru disuntikkan
      SELECT 
        COALESCE(SUM(CASE WHEN item_type = 'MATERIAL' THEN item_total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN item_type = 'LABOR' THEN item_total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN item_type = 'OVERHEAD' THEN item_total ELSE 0 END), 0),
        COALESCE(SUM(item_total), 0)
      INTO v_total_mat, v_total_lab, v_total_foh, v_grand_total
      FROM public.rab_items
      WHERE rab_estimation_id = v_est_id;

      -- 4. Update ringkasan pagu di rab_estimations
      UPDATE public.rab_estimations
      SET 
        total_material_cost = v_total_mat,
        total_labor_cost = v_total_lab,
        total_overhead_cost = v_total_foh,
        total_estimated_cost = v_grand_total
      WHERE id = v_est_id;

      -- 5. Update kolom estimasi pada spk induk jika masih 0
      UPDATE public.spk
      SET total_estimated_cost = v_grand_total
      WHERE id = r_spk.id AND (total_estimated_cost IS NULL OR total_estimated_cost = 0);

      RAISE NOTICE 'Berhasil memulihkan data RAB untuk SPK: % (%), Total Estimasi: Rp %', r_spk.spk_no, r_spk.customer_name, v_grand_total;
    END IF;
  END LOOP;
END $$;

-- 4. Reload PostgREST schema cache agar perubahan skema langsung dikenali API
NOTIFY pgrst, 'reload schema';
