-- ==============================================================================
-- MIGRATION: 20261018020000_purge_and_seed_comprehensive_financial_data.sql
-- Description: Purge legacy transaction data and seed complete end-to-end
--              Job Order Costing scenarios (SPK-001, SPK-002, SPK-003).
--              Preserves master catalog 'materials' and 'users/profiles'.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. PENYESUAIAN SKEMA & KONSTRAIN PENDUKUNG INTEGRITAS DATA
-- ------------------------------------------------------------------------------
ALTER TABLE public.spk ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.spk ADD COLUMN IF NOT EXISTS vehicle_model TEXT;
ALTER TABLE public.spk_borongan ADD COLUMN IF NOT EXISTS job_description TEXT;
ALTER TABLE public.spk_borongan ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.rab_items ALTER COLUMN rab_estimation_id DROP NOT NULL;
ALTER TABLE public.material_requisitions ALTER COLUMN requested_by DROP NOT NULL;
ALTER TABLE public.inventory_transactions ALTER COLUMN issued_by DROP NOT NULL;

-- Perluas validasi qc_status agar mendukung 'IN_PROGRESS'
ALTER TABLE public.spk DROP CONSTRAINT IF EXISTS spk_qc_status_check;
ALTER TABLE public.spk ADD CONSTRAINT spk_qc_status_check 
  CHECK (qc_status IN ('PENDING', 'PASS', 'FAIL', 'IN_PROGRESS'));

-- Perluas validasi invoices_status agar mendukung 'DP_PAID' & 'PAID'
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check 
  CHECK (status IN ('DRAFT', 'UNPAID', 'DP_PAID', 'LUNAS', 'PAID', 'CANCELLED'));

-- Pastikan nilai enum PAID tersedia di spk_borongan_status
ALTER TYPE public.spk_borongan_status ADD VALUE IF NOT EXISTS 'PAID';

-- ==============================================================================
-- 1. BERSIHKAN TABEL TRANSAKSI (TRUNCATE SECARA CASCADE)
-- Master 'materials', 'users', 'profiles', 'product_packages' TETAP UTUH
-- ==============================================================================
TRUNCATE TABLE 
  public.spk_overhead_logs,
  public.inventory_transactions,
  public.material_requisition_items,
  public.material_requisitions,
  public.mandor_requisitions,
  public.requisition_items,
  public.spk_borongan,
  public.change_order_items,
  public.change_orders,
  public.rab_items,
  public.rab_estimations,
  public.invoices,
  public.payments,
  public.qc_inspections,
  public.wbs_checklists,
  public.spk_assets,
  public.spk_amendments,
  public.spk
CASCADE;

-- ==============================================================================
-- 2. PASTIKAN STRUKTUR TABEL SPK_OVERHEAD_LOGS TERSEDIA DENGAN RLS IDEMPOTEN
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.spk_overhead_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spk_id UUID NOT NULL REFERENCES public.spk(id) ON DELETE CASCADE,
  wbs_stage VARCHAR(50) NOT NULL,
  overhead_name VARCHAR(150) NOT NULL,
  frequency_qty NUMERIC(10, 2) NOT NULL DEFAULT 1,
  rate_per_unit NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(15, 2) GENERATED ALWAYS AS (frequency_qty * rate_per_unit) STORED,
  notes TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.spk_overhead_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read spk_overhead_logs" ON public.spk_overhead_logs;
CREATE POLICY "Allow authenticated read spk_overhead_logs" ON public.spk_overhead_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert spk_overhead_logs" ON public.spk_overhead_logs;
CREATE POLICY "Allow authenticated insert spk_overhead_logs" ON public.spk_overhead_logs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated update spk_overhead_logs" ON public.spk_overhead_logs;
CREATE POLICY "Allow authenticated update spk_overhead_logs" ON public.spk_overhead_logs FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated delete spk_overhead_logs" ON public.spk_overhead_logs;
CREATE POLICY "Allow authenticated delete spk_overhead_logs" ON public.spk_overhead_logs FOR DELETE TO authenticated USING (true);

-- ==============================================================================
-- 3. PEMBUATAN TRIGGER INSTEAD OF PADA VIEW UNTUK KOMPATIBILITAS SEEDING
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.fn_trg_insert_final_billing()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.invoices (id, spk_id, total_amount, dp_amount, status, created_at)
  VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.spk_id,
    COALESCE(NEW.total_amount, 0),
    COALESCE(NEW.dp_amount, 0),
    COALESCE(NEW.payment_status, 'UNPAID'),
    COALESCE(NEW.created_at, NOW())
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_insert_final_billing ON public.final_billing;
CREATE TRIGGER trg_insert_final_billing
INSTEAD OF INSERT ON public.final_billing
FOR EACH ROW EXECUTE FUNCTION public.fn_trg_insert_final_billing();

CREATE OR REPLACE FUNCTION public.fn_trg_insert_material_issues()
RETURNS TRIGGER AS $$
DECLARE
  v_req_id UUID;
  v_wbs_cat wbs_category;
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users ORDER BY created_at LIMIT 1;

  v_wbs_cat := CASE 
    WHEN NEW.wbs_stage ILIKE '%Pembongkaran%' THEN 'Pembongkaran'::wbs_category
    WHEN NEW.wbs_stage ILIKE '%Sasis%' THEN 'Sasis/Rangka'::wbs_category
    WHEN NEW.wbs_stage ILIKE '%Dinding%' OR NEW.wbs_stage ILIKE '%Fabrikasi%' THEN 'Dinding/Fabrikasi'::wbs_category
    WHEN NEW.wbs_stage ILIKE '%Cat%' OR NEW.wbs_stage ILIKE '%Finishing%' THEN 'Cat/Finishing'::wbs_category
    WHEN NEW.wbs_stage ILIKE '%Kelistrikan%' OR NEW.wbs_stage ILIKE '%Hidrolik%' THEN 'Kelistrikan/Hidrolik'::wbs_category
    ELSE 'Pembongkaran'::wbs_category
  END;

  SELECT id INTO v_req_id 
  FROM public.material_requisitions 
  WHERE spk_id = NEW.spk_id AND wbs_category = v_wbs_cat 
  LIMIT 1;

  IF v_req_id IS NULL THEN
    INSERT INTO public.material_requisitions (id, spk_id, wbs_category, requested_by, status, created_at)
    VALUES (gen_random_uuid(), NEW.spk_id, v_wbs_cat, v_user_id, 'APPROVED', COALESCE(NEW.created_at, NOW()))
    RETURNING id INTO v_req_id;
  END IF;

  INSERT INTO public.inventory_transactions (
    id, spk_id, requisition_id, material_id, quantity_issued, custom_unit_price, issued_by, status, issued_at
  )
  VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.spk_id,
    v_req_id,
    NEW.material_id,
    NEW.quantity,
    NEW.unit_price,
    v_user_id,
    'ACTIVE',
    COALESCE(NEW.created_at, NOW())
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_insert_material_issues ON public.material_issues;
CREATE TRIGGER trg_insert_material_issues
INSTEAD OF INSERT ON public.material_issues
FOR EACH ROW EXECUTE FUNCTION public.fn_trg_insert_material_issues();

-- ==============================================================================
-- 4. INJEKSI DATA TRANSAKSI SINKRON (3 SKENARIO REALISTIS)
-- ==============================================================================
DO $$
DECLARE
  v_mat_plat UUID;
  v_mat_cat UUID;
  v_mat_kabel UUID;
  v_user_id UUID;
  
  v_spk1_id UUID := gen_random_uuid();
  v_spk2_id UUID := gen_random_uuid();
  v_spk3_id UUID := gen_random_uuid();

  v_rab1_id UUID := gen_random_uuid();
  v_rab2_id UUID := gen_random_uuid();
  v_rab3_id UUID := gen_random_uuid();
BEGIN
  -- Ambil ID user aktif untuk audit trail
  SELECT id INTO v_user_id FROM auth.users ORDER BY created_at LIMIT 1;

  -- Ambil ID sample material dari katalog
  SELECT id INTO v_mat_plat FROM public.materials WHERE name ILIKE '%plat%' OR category ILIKE '%material%' LIMIT 1;
  SELECT id INTO v_mat_cat FROM public.materials WHERE name ILIKE '%cat%' OR name ILIKE '%epoxy%' LIMIT 1;
  SELECT id INTO v_mat_kabel FROM public.materials WHERE id NOT IN (COALESCE(v_mat_plat, '00000000-0000-0000-0000-000000000000'::uuid)) LIMIT 1;

  -- ----------------------------------------------------------------------------
  -- SPK 1: PROYEK DUMP TRUCK ISUZU (LUNAS, FULL SELESAI, PROFITABLE)
  -- ----------------------------------------------------------------------------
  INSERT INTO public.spk (id, spk_no, customer_name, vehicle_plate, vehicle_model, status, qc_status, created_by, created_at)
  VALUES (v_spk1_id, 'SPK-2026-001', 'PT LOGISTIK MAJU BERSAMA', 'B 9123 KRO', 'ISUZU GIGA FVR', 'COMPLETED', 'PASS', v_user_id, NOW() - INTERVAL '15 days');

  INSERT INTO public.rab_estimations (id, spk_id, total_material_cost, total_labor_cost, total_overhead_cost, total_estimated_cost, created_at)
  VALUES (v_rab1_id, v_spk1_id, 10500000, 4500000, 2400000, 17400000, NOW() - INTERVAL '15 days');

  -- RAB SPK 1 (Material, Labor, Overhead 3 Unsur Lengkap)
  INSERT INTO public.rab_items (spk_id, rab_estimation_id, item_type, wbs_category, material_id, material_name, quantity, unit, unit_price, cost_price, item_total)
  VALUES
    (v_spk1_id, v_rab1_id, 'MATERIAL', 'Pembongkaran'::wbs_category, v_mat_plat, 'Chemical & Gas Potong', 1, 'paket', 500000, 400000, 500000),
    (v_spk1_id, v_rab1_id, 'LABOR',    'Pembongkaran'::wbs_category, NULL,       'Jasa Bongkar Bak Lama', 1, 'lot',   1000000, 1000000, 1000000),
    (v_spk1_id, v_rab1_id, 'OVERHEAD', 'Pembongkaran'::wbs_category, NULL,       'Sewa Bay & Listrik WBS 1', 1, 'frekuensi', 800000, 800000, 800000),
    (v_spk1_id, v_rab1_id, 'MATERIAL', 'Sasis/Rangka'::wbs_category, v_mat_plat, 'Plat Besi & UNP Rangka', 4, 'lembar', 2500000, 2000000, 10000000),
    (v_spk1_id, v_rab1_id, 'LABOR',    'Sasis/Rangka'::wbs_category, NULL,       'Jasa Las & Sambung Sasis', 1, 'lot', 3500000, 3500000, 3500000),
    (v_spk1_id, v_rab1_id, 'OVERHEAD', 'Sasis/Rangka'::wbs_category, NULL,       'Sewa Bay & Listrik WBS 2', 2, 'frekuensi', 800000, 800000, 1600000);

  -- Realisasi Pengeluaran Gudang (Goods Issue) SPK 1
  INSERT INTO public.material_issues (spk_id, wbs_stage, material_id, quantity, unit_price, created_at)
  VALUES
    (v_spk1_id, 'WBS 1: Pembongkaran', v_mat_plat, 1, 400000, NOW() - INTERVAL '14 days'),
    (v_spk1_id, 'WBS 2: Sasis/Rangka', v_mat_plat, 4, 2000000, NOW() - INTERVAL '10 days');

  -- Realisasi Upah Borongan Mandor SPK 1
  INSERT INTO public.spk_borongan (spk_id, wbs_category, worker_name, task_description, job_description, contract_value, status, created_by, created_at)
  VALUES
    (v_spk1_id, 'Pembongkaran'::wbs_category, 'Tim Las Cak Slamet', 'Bongkar Bak Lama', 'Bongkar Bak Lama', 1000000, 'PAID', v_user_id, NOW() - INTERVAL '13 days'),
    (v_spk1_id, 'Sasis/Rangka'::wbs_category, 'Tim Las Cak Slamet', 'Pengelasan Sasis & Rangka', 'Pengelasan Sasis & Rangka', 3500000, 'PAID', v_user_id, NOW() - INTERVAL '8 days');

  -- Realisasi Overhead Inap SPK 1
  INSERT INTO public.spk_overhead_logs (spk_id, wbs_stage, overhead_name, frequency_qty, rate_per_unit, recorded_at)
  VALUES
    (v_spk1_id, 'WBS 1: Pembongkaran', 'Pemakaian Bay & Listrik Mesin', 1, 800000, NOW() - INTERVAL '13 days'),
    (v_spk1_id, 'WBS 2: Sasis/Rangka', 'Pemakaian Bay & Listrik Mesin', 2, 800000, NOW() - INTERVAL '8 days');

  -- Tagihan & Pelunasan Final Billing SPK 1 (Total: 22.000.000, DP: 5.000.000, Lunas)
  INSERT INTO public.final_billing (spk_id, total_amount, dp_amount, payment_status, created_at)
  VALUES (v_spk1_id, 22000000, 5000000, 'LUNAS', NOW() - INTERVAL '5 days');

  -- ----------------------------------------------------------------------------
  -- SPK 2: PROYEK BOX PENDINGIN (WIP / AKTIF - TERJADI BOROS MATERIAL WBS 2)
  -- ----------------------------------------------------------------------------
  INSERT INTO public.spk (id, spk_no, customer_name, vehicle_plate, vehicle_model, status, qc_status, created_by, created_at)
  VALUES (v_spk2_id, 'SPK-2026-002', 'CV SUMBER DINGIN UTAMA', 'L 8832 UY', 'HINO DUTRO 130HD', 'ACTIVE', 'IN_PROGRESS', v_user_id, NOW() - INTERVAL '7 days');

  INSERT INTO public.rab_estimations (id, spk_id, total_material_cost, total_labor_cost, total_overhead_cost, total_estimated_cost, created_at)
  VALUES (v_rab2_id, v_spk2_id, 3000000, 2000000, 1000000, 6000000, NOW() - INTERVAL '7 days');

  INSERT INTO public.rab_items (spk_id, rab_estimation_id, item_type, wbs_category, material_id, material_name, quantity, unit, unit_price, cost_price, item_total)
  VALUES
    (v_spk2_id, v_rab2_id, 'MATERIAL', 'Sasis/Rangka'::wbs_category, v_mat_plat, 'Plat Galvanis Rangka Box', 2, 'lembar', 1500000, 1200000, 3000000),
    (v_spk2_id, v_rab2_id, 'LABOR',    'Sasis/Rangka'::wbs_category, NULL,       'Jasa Rangka Box', 1, 'lot', 2000000, 2000000, 2000000),
    (v_spk2_id, v_rab2_id, 'OVERHEAD', 'Sasis/Rangka'::wbs_category, NULL,       'Bay Rate Pembuatan Box', 1, 'frekuensi', 1000000, 1000000, 1000000);

  -- Konsumsi gudang boros: dianggarkan 2 lembar (Rp 3.0jt budget), keluar 3 lembar (Rp 3.6jt spent) -> OVERBUDGET Material
  INSERT INTO public.material_issues (spk_id, wbs_stage, material_id, quantity, unit_price, created_at)
  VALUES (v_spk2_id, 'WBS 2: Sasis/Rangka', v_mat_plat, 3, 1200000, NOW() - INTERVAL '2 days');

  INSERT INTO public.spk_borongan (spk_id, wbs_category, worker_name, task_description, job_description, contract_value, status, created_by, created_at)
  VALUES (v_spk2_id, 'Sasis/Rangka'::wbs_category, 'Pak Budi Fabrikasi', 'Perakitan Rangka Box', 'Perakitan Rangka Box', 2000000, 'PAID', v_user_id, NOW() - INTERVAL '1 day');

  INSERT INTO public.final_billing (spk_id, total_amount, dp_amount, payment_status, created_at)
  VALUES (v_spk2_id, 9000000, 3000000, 'DP_PAID', NOW() - INTERVAL '6 days');

  -- ----------------------------------------------------------------------------
  -- SPK 3: POTONG SASIS (QC PASS - TERTANDAI HANDOVER LOCK KARENA BELUM LUNAS)
  -- ----------------------------------------------------------------------------
  INSERT INTO public.spk (id, spk_no, customer_name, vehicle_plate, vehicle_model, status, qc_status, created_by, created_at)
  VALUES (v_spk3_id, 'SPK-2026-003', 'PT EKSPEDISI NUSANTARA', 'W 4556 TR', 'MITSUBISHI CANTER', 'ACTIVE', 'PASS', v_user_id, NOW() - INTERVAL '10 days');

  INSERT INTO public.rab_estimations (id, spk_id, total_material_cost, total_labor_cost, total_overhead_cost, total_estimated_cost, created_at)
  VALUES (v_rab3_id, v_spk3_id, 800000, 2500000, 500000, 3800000, NOW() - INTERVAL '10 days');

  INSERT INTO public.rab_items (spk_id, rab_estimation_id, item_type, wbs_category, material_id, material_name, quantity, unit, unit_price, cost_price, item_total)
  VALUES
    (v_spk3_id, v_rab3_id, 'MATERIAL', 'Sasis/Rangka'::wbs_category, v_mat_plat, 'Baut Baja & Penguat Sasis', 1, 'paket', 800000, 600000, 800000),
    (v_spk3_id, v_rab3_id, 'LABOR',    'Sasis/Rangka'::wbs_category, NULL,       'Jasa Potong & Sambung Canter', 1, 'lot', 2500000, 2500000, 2500000),
    (v_spk3_id, v_rab3_id, 'OVERHEAD', 'Sasis/Rangka'::wbs_category, NULL,       'Sewa Stasiun Sasis', 1, 'frekuensi', 500000, 500000, 500000);

  INSERT INTO public.material_issues (spk_id, wbs_stage, material_id, quantity, unit_price, created_at)
  VALUES (v_spk3_id, 'WBS 2: Sasis/Rangka', v_mat_plat, 1, 600000, NOW() - INTERVAL '7 days');

  INSERT INTO public.spk_borongan (spk_id, wbs_category, worker_name, task_description, job_description, contract_value, status, created_by, created_at)
  VALUES (v_spk3_id, 'Sasis/Rangka'::wbs_category, 'Tim Khusus Sasis', 'Potong dan Sambung Sasis Canter', 'Potong dan Sambung Sasis Canter', 2500000, 'PAID', v_user_id, NOW() - INTERVAL '5 days');

  INSERT INTO public.spk_overhead_logs (spk_id, wbs_stage, overhead_name, frequency_qty, rate_per_unit, recorded_at)
  VALUES (v_spk3_id, 'WBS 2: Sasis/Rangka', 'Sewa Stasiun Sasis', 1, 500000, NOW() - INTERVAL '5 days');

  -- Tagihan 5.000.000, DP 2.000.000, Sisa 3.000.000 -> Status Piutang Tertahan Pelunasan
  INSERT INTO public.final_billing (spk_id, total_amount, dp_amount, payment_status, created_at)
  VALUES (v_spk3_id, 5000000, 2000000, 'UNPAID', NOW() - INTERVAL '2 days');

END $$;
