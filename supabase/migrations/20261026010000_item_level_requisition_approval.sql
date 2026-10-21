-- ==============================================================================
-- Migrasi: Granular Item-Level Material Approval in Warehouse Mandor Requests
-- File: supabase/migrations/20261026010000_item_level_requisition_approval.sql
-- Keterangan:
-- 1. Menambahkan enum value PARTIALLY_ISSUED dan COMPLETED pada tipe requisition_status jika ada.
-- 2. Memastikan kolom status ada pada material_requisition_items (default 'PENDING').
-- 3. Membuat fungsi RPC approve_single_requisition_item untuk approve per baris item secara atomik.
-- 4. Membuat fungsi RPC reject_single_requisition_item untuk reject / hold per baris item secara atomik.
-- ==============================================================================

-- 1. Dukungan status PARTIALLY_ISSUED dan COMPLETED pada enum requisition_status
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'requisition_status') THEN
    BEGIN
      ALTER TYPE requisition_status ADD VALUE IF NOT EXISTS 'PARTIALLY_ISSUED';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE requisition_status ADD VALUE IF NOT EXISTS 'COMPLETED';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE requisition_status ADD VALUE IF NOT EXISTS 'ISSUED';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- 2. Pastikan kolom status pada material_requisition_items memiliki nilai yang memadai
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'material_requisition_items' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.material_requisition_items ADD COLUMN status VARCHAR(20) DEFAULT 'PENDING';
  END IF;
END $$;

-- Pastikan indeks pencarian status per requisition_id ada untuk performa kueri
CREATE INDEX IF NOT EXISTS idx_material_requisition_items_status_req
ON public.material_requisition_items (requisition_id, status);

-- 3. Fungsi RPC untuk approve material per item secara atomik
CREATE OR REPLACE FUNCTION public.approve_single_requisition_item(
  p_requisition_item_id UUID,
  p_approved_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_req RECORD;
  v_remaining_pending INT;
  v_stock_before NUMERIC;
  v_stock_after NUMERIC;
  v_approver_name TEXT;
  v_approver_role TEXT;
  v_unit_price NUMERIC;
BEGIN
  -- Ambil data item requisition
  SELECT * INTO v_item 
  FROM public.material_requisition_items 
  WHERE id = p_requisition_item_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Item requisition tidak ditemukan');
  END IF;

  IF v_item.status = 'APPROVED' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Item sudah pernah disetujui');
  END IF;

  -- Ambil data requisition induk
  SELECT * INTO v_req 
  FROM public.material_requisitions 
  WHERE id = v_item.requisition_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Permintaan material induk tidak ditemukan');
  END IF;

  -- Ambil data profil petugas approver
  SELECT full_name, role INTO v_approver_name, v_approver_role 
  FROM public.profiles 
  WHERE id = p_approved_by;

  -- 1. Update status item menjadi APPROVED
  UPDATE public.material_requisition_items
  SET status = 'APPROVED'
  WHERE id = p_requisition_item_id;

  -- 2. Kurangi stok fisik di master materials jika berelasi
  IF v_item.material_id IS NOT NULL THEN
    SELECT current_stock, unit_price INTO v_stock_before, v_unit_price 
    FROM public.materials 
    WHERE id = v_item.material_id;

    v_stock_before := COALESCE(v_stock_before, 0);
    v_stock_after := GREATEST(0, v_stock_before - COALESCE(v_item.quantity, 0));

    UPDATE public.materials
    SET current_stock = v_stock_after
    WHERE id = v_item.material_id;
  ELSE
    v_stock_before := 0;
    v_stock_after := 0;
  END IF;

  -- 3. Catat transaksi pengeluaran barang ke inventory_transactions
  INSERT INTO public.inventory_transactions (
    spk_id,
    requisition_id,
    requisition_item_id,
    material_id,
    quantity_issued,
    custom_unit_price,
    stock_before,
    stock_after,
    issued_by,
    issued_by_user_id,
    issued_by_name,
    issued_by_role,
    audit_notes,
    status,
    issued_at
  ) VALUES (
    v_req.spk_id,
    v_req.id,
    v_item.id,
    v_item.material_id,
    COALESCE(v_item.quantity, 0),
    COALESCE(v_item.unit_price, v_unit_price, 0),
    v_stock_before,
    v_stock_after,
    p_approved_by,
    p_approved_by,
    COALESCE(v_approver_name, 'Petugas Gudang'),
    COALESCE(v_approver_role, 'petugas_gudang'),
    'Persetujuan granular per item oleh Petugas Gudang',
    'ACTIVE',
    NOW()
  );

  -- 4. Evaluasi sisa pending item pada requisition induk
  SELECT COUNT(*) INTO v_remaining_pending
  FROM public.material_requisition_items
  WHERE requisition_id = v_item.requisition_id AND status = 'PENDING';

  IF v_remaining_pending = 0 THEN
    UPDATE public.material_requisitions 
    SET status = 'COMPLETED',
        updated_at = NOW() 
    WHERE id = v_item.requisition_id;
  ELSE
    UPDATE public.material_requisitions 
    SET status = 'PARTIALLY_ISSUED',
        updated_at = NOW() 
    WHERE id = v_item.requisition_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Item material berhasil disetujui dan dikeluarkan',
    'remaining_pending', v_remaining_pending,
    'requisition_id', v_item.requisition_id,
    'item_id', v_item.id
  );
END;
$$;

-- 4. Fungsi RPC untuk reject / hold material per item secara atomik
CREATE OR REPLACE FUNCTION public.reject_single_requisition_item(
  p_requisition_item_id UUID,
  p_rejected_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_remaining_pending INT;
  v_approved_count INT;
BEGIN
  -- Ambil data item requisition
  SELECT * INTO v_item 
  FROM public.material_requisition_items 
  WHERE id = p_requisition_item_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Item requisition tidak ditemukan');
  END IF;

  -- 1. Update status item menjadi REJECTED
  UPDATE public.material_requisition_items
  SET status = 'REJECTED'
  WHERE id = p_requisition_item_id;

  -- 2. Evaluasi status induk requisition
  SELECT COUNT(*) INTO v_remaining_pending
  FROM public.material_requisition_items
  WHERE requisition_id = v_item.requisition_id AND status = 'PENDING';

  SELECT COUNT(*) INTO v_approved_count
  FROM public.material_requisition_items
  WHERE requisition_id = v_item.requisition_id AND status = 'APPROVED';

  IF v_remaining_pending = 0 THEN
    IF v_approved_count > 0 THEN
      UPDATE public.material_requisitions 
      SET status = 'COMPLETED',
          updated_at = NOW() 
      WHERE id = v_item.requisition_id;
    ELSE
      UPDATE public.material_requisitions 
      SET status = 'REJECTED',
          updated_at = NOW() 
      WHERE id = v_item.requisition_id;
    END IF;
  ELSE
    IF v_approved_count > 0 THEN
      UPDATE public.material_requisitions 
      SET status = 'PARTIALLY_ISSUED',
          updated_at = NOW() 
      WHERE id = v_item.requisition_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Item material berhasil ditolak',
    'remaining_pending', v_remaining_pending,
    'approved_count', v_approved_count,
    'requisition_id', v_item.requisition_id,
    'item_id', v_item.id
  );
END;
$$;

-- 5. Hak akses eksekusi RPC
GRANT EXECUTE ON FUNCTION public.approve_single_requisition_item(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_single_requisition_item(UUID, UUID) TO authenticated;
