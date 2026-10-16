-- ==============================================================================
-- TRIGGER HARD-GATE: LOCK SPK COMPLETION UNLESS BILLING IS FULLY PAID
-- ROBELKAROSERI ENTERPRISE REVENUE PROTECTION
-- ==============================================================================

CREATE OR REPLACE FUNCTION check_spk_completion_billing_status()
RETURNS TRIGGER AS $$
DECLARE
  v_billing_record RECORD;
  v_is_paid BOOLEAN := FALSE;
  v_spk_identifier TEXT;
BEGIN
  -- Hanya evaluasi jika status SPK berubah menjadi 'COMPLETED'
  IF NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status != 'COMPLETED') THEN
    -- Amankan identifier nomor SPK (spk_number / spk_no / id)
    v_spk_identifier := COALESCE(NEW.spk_number, NEW.spk_no, NEW.id::text);
    
    -- Periksa tabel penagihan (final_billing / invoices) yang terikat ke SPK ini
    SELECT 
      id,
      payment_status,
      COALESCE(total_amount, 0) AS total_bill,
      COALESCE(dp_amount, 0) + COALESCE(paid_amount, 0) AS total_paid
    INTO v_billing_record
    FROM final_billing
    WHERE spk_id = NEW.id
    ORDER BY created_at DESC
    LIMIT 1;

    -- Validasi 1: Apakah dokumen billing sudah diterbitkan?
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Pelanggaran Handover Gate: SPK % tidak dapat diselesaikan karena Faktur Penagihan Akhir (Final Billing) belum diterbitkan.', v_spk_identifier;
    END IF;

    -- Validasi 2: Apakah status pembayaran sudah LUNAS atau sisa saldo <= 0?
    IF v_billing_record.payment_status IN ('LUNAS', 'PAID') OR (v_billing_record.total_bill > 0 AND v_billing_record.total_paid >= v_billing_record.total_bill) THEN
      v_is_paid := TRUE;
    END IF;

    IF NOT v_is_paid THEN
      RAISE EXCEPTION 'Pelanggaran Handover Gate: Kendaraan SPK % belum dapat diserahterimakan (COMPLETED). Status pembayaran masih %, sisa tagihan belum lunas.', 
        v_spk_identifier, v_billing_record.payment_status;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Pasang Trigger pada tabel spk
DROP TRIGGER IF EXISTS trg_enforce_handover_billing_lock ON public.spk;
CREATE TRIGGER trg_enforce_handover_billing_lock
BEFORE UPDATE ON public.spk
FOR EACH ROW
EXECUTE FUNCTION check_spk_completion_billing_status();
