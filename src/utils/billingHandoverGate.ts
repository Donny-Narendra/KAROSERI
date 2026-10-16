/**
 * Billing Handover Gate & Revenue Protection
 * Client-side validator and mirror for PostgreSQL trigger:
 * trg_enforce_handover_billing_lock / check_spk_completion_billing_status()
 * Defined in: supabase/migrations/20261016030000_enforce_handover_billing_trigger.sql
 */

export interface SpkHandoverTarget {
  id: string;
  spk_number?: string;
  spk_no?: string;
  status: string;
}

export interface FinalBillingSnapshot {
  id: string;
  spk_id: string;
  payment_status: string;
  total_amount: number;
  dp_amount: number;
  paid_amount: number;
}

export interface HandoverValidationResult {
  allowed: boolean;
  reason?: string;
}

export const HANDOVER_TRIGGER_METADATA = {
  functionName: 'check_spk_completion_billing_status',
  triggerName: 'trg_enforce_handover_billing_lock',
  targetTable: 'public.spk',
  timing: 'BEFORE UPDATE',
  migrationFile: '20261016030000_enforce_handover_billing_trigger.sql',
} as const;

/**
 * Validates whether an SPK status update to COMPLETED complies with
 * the PostgreSQL Handover Hard-Gate trigger rules.
 */
export function validateSpkCompletionBillingStatus(
  oldStatus: string | null | undefined,
  newSpk: SpkHandoverTarget,
  billingRecord: FinalBillingSnapshot | null | undefined
): HandoverValidationResult {
  // Hanya evaluasi jika status SPK berubah menjadi 'COMPLETED'
  if (newSpk.status === 'COMPLETED' && (!oldStatus || oldStatus !== 'COMPLETED')) {
    const spkIdentifier = newSpk.spk_number || newSpk.spk_no || newSpk.id;

    // Validasi 1: Dokumen billing harus sudah diterbitkan
    if (!billingRecord) {
      return {
        allowed: false,
        reason: `Pelanggaran Handover Gate: SPK ${spkIdentifier} tidak dapat diselesaikan karena Faktur Penagihan Akhir (Final Billing) belum diterbitkan.`,
      };
    }

    const totalBill = Number(billingRecord.total_amount) || 0;
    const totalPaid = (Number(billingRecord.dp_amount) || 0) + (Number(billingRecord.paid_amount) || 0);

    // Validasi 2: Status pembayaran harus LUNAS/PAID atau sisa saldo lunas
    const isPaid =
      ['LUNAS', 'PAID'].includes(billingRecord.payment_status?.toUpperCase()) ||
      (totalBill > 0 && totalPaid >= totalBill);

    if (!isPaid) {
      return {
        allowed: false,
        reason: `Pelanggaran Handover Gate: Kendaraan SPK ${spkIdentifier} belum dapat diserahterimakan (COMPLETED). Status pembayaran masih ${billingRecord.payment_status}, sisa tagihan belum lunas.`,
      };
    }
  }

  return { allowed: true };
}
