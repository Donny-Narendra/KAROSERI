-- ==============================================================================
-- Migrasi: Handle Reject Requisition Item and Automatic Status Reconciliation
-- File: supabase/migrations/20261022020000_handle_reject_requisition_item.sql
-- Keterangan:
-- 1. Menyediakan fungsi RPC reject_single_requisition_item untuk menolak / hold item material
--    secara granular dari antarmuka Gudang.
-- 2. Mengubah status material_requisition_items menjadi 'REJECTED'.
-- 3. Mengevaluasi status dokumen induk material_requisitions:
--    - Jika semua item berstatus REJECTED -> status induk diubah menjadi 'REJECTED'.
--    - Jika tidak ada pending lagi dan ada item berstatus APPROVED -> status induk menjadi 'COMPLETED'.
--    - Jika masih ada sisa item PENDING -> status induk menjadi 'PARTIALLY_ISSUED'.
-- 4. Memberikan izin eksekusi RPC kepada authenticated users.
-- ==============================================================================

-- Drop existing function with older signature if present to avoid overload ambiguity
DROP FUNCTION IF EXISTS public.reject_single_requisition_item(UUID, UUID);

CREATE OR REPLACE FUNCTION public.reject_single_requisition_item(
  p_requisition_item_id UUID,
  p_rejected_by UUID,
  p_reason TEXT DEFAULT 'Ditolak/Hold oleh Petugas Gudang'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req_id UUID;
  v_remaining_pending INT;
  v_remaining_approved INT;
BEGIN
  -- Ambil ID requisition induk dari item terkait
  SELECT requisition_id INTO v_req_id 
  FROM public.material_requisition_items 
  WHERE id = p_requisition_item_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Item requisition tidak ditemukan');
  END IF;

  -- Update status item menjadi REJECTED
  UPDATE public.material_requisition_items
  SET status = 'REJECTED'
  WHERE id = p_requisition_item_id;

  -- Evaluasi status header requisition
  SELECT 
    COUNT(*) FILTER (WHERE status = 'PENDING' OR status IS NULL),
    COUNT(*) FILTER (WHERE status = 'APPROVED')
  INTO v_remaining_pending, v_remaining_approved
  FROM public.material_requisition_items
  WHERE requisition_id = v_req_id;

  IF v_remaining_pending = 0 AND v_remaining_approved = 0 THEN
    UPDATE public.material_requisitions 
    SET status = 'REJECTED',
        updated_at = NOW(),
        audit_notes = COALESCE(audit_notes || E'\n', '') || p_reason
    WHERE id = v_req_id;
  ELSIF v_remaining_pending = 0 AND v_remaining_approved > 0 THEN
    UPDATE public.material_requisitions 
    SET status = 'COMPLETED',
        updated_at = NOW()
    WHERE id = v_req_id;
  ELSE
    UPDATE public.material_requisitions 
    SET status = 'PARTIALLY_ISSUED',
        updated_at = NOW()
    WHERE id = v_req_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Item material berhasil ditolak / di-hold',
    'remaining_pending', v_remaining_pending,
    'remaining_approved', v_remaining_approved,
    'requisition_id', v_req_id,
    'item_id', p_requisition_item_id
  );
END;
$$;

-- Berikan izin eksekusi kepada role authenticated
GRANT EXECUTE ON FUNCTION public.reject_single_requisition_item(UUID, UUID, TEXT) TO authenticated;
