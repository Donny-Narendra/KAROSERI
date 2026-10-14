-- ============================================================================
-- Migrasi: Void Material Issue Rollback & Sinkronisasi Mandor Requests
-- File: supabase/migrations/20261014_void_material_issue_rollback.sql
-- Keterangan: 
-- 1. Menambahkan kolom relasi requisition_id & requisition_item_id pada inventory_transactions
-- 2. Menambahkan kolom status pada material_requisition_items
-- 3. Membuat fungsi database (RPC) void_material_issue & void_material_issues
-- ============================================================================

-- 1. Tambah kolom relasi ke material_requisitions pada inventory_transactions
ALTER TABLE public.inventory_transactions 
ADD COLUMN IF NOT EXISTS requisition_id UUID REFERENCES public.material_requisitions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS requisition_item_id UUID REFERENCES public.material_requisition_items(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';

-- 2. Tambah kolom status pada material_requisition_items jika belum ada
ALTER TABLE public.material_requisition_items 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PENDING';

-- 3. Fungsi RPC: void_material_issue (Single Transaction)
CREATE OR REPLACE FUNCTION public.void_material_issue(p_issue_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_issue RECORD;
  v_req_item_id UUID;
  v_req_id UUID;
  v_qty NUMERIC;
  v_material_id UUID;
BEGIN
  -- A. Ambil data transaksi issue
  SELECT * INTO v_issue 
  FROM public.inventory_transactions 
  WHERE id = p_issue_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Transaksi pengeluaran tidak ditemukan atau sudah dibatalkan'
    );
  END IF;

  v_qty := COALESCE(v_issue.quantity_issued, 0);
  v_material_id := v_issue.material_id;
  v_req_item_id := v_issue.requisition_item_id;
  v_req_id := v_issue.requisition_id;

  -- B. Kembalikan stok fisik material di tabel materials
  IF v_material_id IS NOT NULL AND v_qty > 0 THEN
    UPDATE public.materials
    SET current_stock = COALESCE(current_stock, 0) + v_qty
    WHERE id = v_material_id;
  END IF;

  -- C. Cari relasi permintaan jika belum tersimpan langsung di transaksi
  IF v_req_id IS NULL AND v_issue.spk_id IS NOT NULL AND v_material_id IS NOT NULL THEN
    SELECT mri.requisition_id, mri.id
    INTO v_req_id, v_req_item_id
    FROM public.material_requisition_items mri
    JOIN public.material_requisitions mr ON mr.id = mri.requisition_id
    WHERE mr.spk_id = v_issue.spk_id
      AND mri.material_id = v_material_id
      AND mr.status = 'APPROVED'
    ORDER BY mr.updated_at DESC
    LIMIT 1;
  END IF;

  -- D. Kembalikan status item & header permintaan ke 'PENDING'
  IF v_req_item_id IS NOT NULL THEN
    UPDATE public.material_requisition_items
    SET status = 'PENDING'
    WHERE id = v_req_item_id;
  END IF;

  IF v_req_id IS NOT NULL THEN
    UPDATE public.material_requisitions
    SET status = 'PENDING',
        updated_at = timezone('utc'::text, now())
    WHERE id = v_req_id;
  END IF;

  -- E. Hapus baris transaksi aktif pengeluaran agar tidak terhitung ganda dalam biaya riil SPK
  DELETE FROM public.inventory_transactions 
  WHERE id = p_issue_id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Transaksi berhasil di-void, stok material dikembalikan, dan permintaan telah dipulihkan ke antrean Mandor Requests',
    'issue_id', p_issue_id,
    'requisition_id', v_req_id,
    'requisition_item_id', v_req_item_id
  );
END;
$$;

-- 4. Fungsi RPC: void_material_issues (Batch / Bulk Transactions)
CREATE OR REPLACE FUNCTION public.void_material_issues(p_issue_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_res JSONB;
  v_success_count INT := 0;
BEGIN
  IF p_issue_ids IS NULL OR array_length(p_issue_ids, 1) = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Tidak ada transaksi yang dipilih');
  END IF;

  FOREACH v_id IN ARRAY p_issue_ids LOOP
    v_res := public.void_material_issue(v_id);
    IF (v_res->>'success')::boolean THEN
      v_success_count := v_success_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'count', v_success_count,
    'message', format('%s transaksi berhasil di-void dan dikembalikan ke antrean permintaan mandor', v_success_count)
  );
END;
$$;

-- 5. Berikan izin akses eksekusi RPC untuk pengguna terautentikasi (petugas gudang, mandor, admin, owner)
GRANT EXECUTE ON FUNCTION public.void_material_issue(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_material_issues(UUID[]) TO authenticated;
