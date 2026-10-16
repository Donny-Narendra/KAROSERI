import { describe, it, expect } from 'vitest';
import {
  validateSpkCompletionBillingStatus,
  HANDOVER_TRIGGER_METADATA,
  type SpkHandoverTarget,
  type FinalBillingSnapshot,
} from '../billingHandoverGate';

describe('PostgreSQL Handover Billing Gate Migration & Trigger Logic', () => {
  it('has consistent metadata matching PostgreSQL migration specification', () => {
    expect(HANDOVER_TRIGGER_METADATA.functionName).toBe('check_spk_completion_billing_status');
    expect(HANDOVER_TRIGGER_METADATA.triggerName).toBe('trg_enforce_handover_billing_lock');
    expect(HANDOVER_TRIGGER_METADATA.targetTable).toBe('public.spk');
    expect(HANDOVER_TRIGGER_METADATA.timing).toBe('BEFORE UPDATE');
    expect(HANDOVER_TRIGGER_METADATA.migrationFile).toBe('20261016030000_enforce_handover_billing_trigger.sql');
  });

  describe('Trigger Hard-Gate Simulation & Validation Tests', () => {
    const baseSpk: SpkHandoverTarget = {
      id: 'spk-uuid-101',
      spk_number: 'SPK-2026-001',
      status: 'ACTIVE',
    };

    it('blocks completion when no final billing invoice exists', () => {
      const updatedSpk: SpkHandoverTarget = { ...baseSpk, status: 'COMPLETED' };
      const result = validateSpkCompletionBillingStatus('ACTIVE', updatedSpk, null);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain(
        'Pelanggaran Handover Gate: SPK SPK-2026-001 tidak dapat diselesaikan karena Faktur Penagihan Akhir (Final Billing) belum diterbitkan.'
      );
    });

    it('blocks completion when invoice exists but status is UNPAID and balance remains', () => {
      const updatedSpk: SpkHandoverTarget = { ...baseSpk, status: 'COMPLETED' };
      const billing: FinalBillingSnapshot = {
        id: 'inv-1',
        spk_id: 'spk-uuid-101',
        payment_status: 'UNPAID',
        total_amount: 50000000,
        dp_amount: 15000000,
        paid_amount: 0,
      };

      const result = validateSpkCompletionBillingStatus('ACTIVE', updatedSpk, billing);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain(
        'Pelanggaran Handover Gate: Kendaraan SPK SPK-2026-001 belum dapat diserahterimakan (COMPLETED). Status pembayaran masih UNPAID, sisa tagihan belum lunas.'
      );
    });

    it('blocks completion when invoice status is DRAFT', () => {
      const updatedSpk: SpkHandoverTarget = { ...baseSpk, status: 'COMPLETED' };
      const billing: FinalBillingSnapshot = {
        id: 'inv-2',
        spk_id: 'spk-uuid-101',
        payment_status: 'DRAFT',
        total_amount: 30000000,
        dp_amount: 0,
        paid_amount: 0,
      };

      const result = validateSpkCompletionBillingStatus('ACTIVE', updatedSpk, billing);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain(
        'Pelanggaran Handover Gate: Kendaraan SPK SPK-2026-001 belum dapat diserahterimakan (COMPLETED). Status pembayaran masih DRAFT, sisa tagihan belum lunas.'
      );
    });

    it('allows completion when invoice status is LUNAS', () => {
      const updatedSpk: SpkHandoverTarget = { ...baseSpk, status: 'COMPLETED' };
      const billing: FinalBillingSnapshot = {
        id: 'inv-3',
        spk_id: 'spk-uuid-101',
        payment_status: 'LUNAS',
        total_amount: 50000000,
        dp_amount: 20000000,
        paid_amount: 30000000,
      };

      const result = validateSpkCompletionBillingStatus('ACTIVE', updatedSpk, billing);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('allows completion when invoice status is PAID', () => {
      const updatedSpk: SpkHandoverTarget = { ...baseSpk, status: 'COMPLETED' };
      const billing: FinalBillingSnapshot = {
        id: 'inv-4',
        spk_id: 'spk-uuid-101',
        payment_status: 'PAID',
        total_amount: 25000000,
        dp_amount: 10000000,
        paid_amount: 15000000,
      };

      const result = validateSpkCompletionBillingStatus('ACTIVE', updatedSpk, billing);
      expect(result.allowed).toBe(true);
    });

    it('allows completion when total paid (DP + paid_amount) equals or exceeds total amount even if status is UNPAID', () => {
      const updatedSpk: SpkHandoverTarget = { ...baseSpk, status: 'COMPLETED' };
      const billing: FinalBillingSnapshot = {
        id: 'inv-5',
        spk_id: 'spk-uuid-101',
        payment_status: 'UNPAID', // edge case: amount paid in full
        total_amount: 40000000,
        dp_amount: 20000000,
        paid_amount: 20000000,
      };

      const result = validateSpkCompletionBillingStatus('ACTIVE', updatedSpk, billing);
      expect(result.allowed).toBe(true);
    });

    it('allows non-completed status transitions without billing check (e.g. CANCELLED, ACTIVE)', () => {
      const cancelledSpk: SpkHandoverTarget = { ...baseSpk, status: 'CANCELLED' };
      const result = validateSpkCompletionBillingStatus('ACTIVE', cancelledSpk, null);

      expect(result.allowed).toBe(true);
    });

    it('skips billing check when SPK is already COMPLETED and modifying other attributes', () => {
      const alreadyCompletedSpk: SpkHandoverTarget = { ...baseSpk, status: 'COMPLETED' };
      const result = validateSpkCompletionBillingStatus('COMPLETED', alreadyCompletedSpk, null);

      expect(result.allowed).toBe(true);
    });

    it('gracefully falls back to spk_no or id if spk_number is undefined', () => {
      const spkWithoutNumber: SpkHandoverTarget = {
        id: 'spk-uuid-fallback',
        spk_no: 'SPK-FALLBACK-099',
        status: 'COMPLETED',
      };

      const result = validateSpkCompletionBillingStatus('ACTIVE', spkWithoutNumber, null);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Pelanggaran Handover Gate: SPK SPK-FALLBACK-099 tidak dapat diselesaikan');
    });
  });
});
