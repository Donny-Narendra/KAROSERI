import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { KasirDashboard } from '../KasirDashboard';
import { supabase } from '../../lib/supabaseClient';
import * as billingService from '../../services/billingService';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'kasir-user-8209', email: 'dewi.kasir@robelkaroseri.com' },
    profile: { id: 'kasir-user-8209', full_name: 'Dewi Kasir', role: 'kasir' },
    signOut: vi.fn(),
  }),
}));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../../services/packageService', () => ({
  packageService: {
    getPackages: vi.fn().mockResolvedValue([]),
  },
}));

describe('Integration: KasirDashboard (Down Payment Correction with Immutable Audit Trail)', () => {
  const mockSpk8209 = {
    id: 'spk-uuid-8209',
    spk_no: 'SPK-8209',
    customer_name: 'PT Karoseri Mitra Jaya',
    vehicle_plate: 'L 8209 AA',
    vehicle_vin: 'VIN-8209-XYZ',
    vehicle_number: 'L 8209 AA',
    vehicle_engine: 'ENG-8209',
    vehicle_model: 'Mitsubishi Colt Diesel FE 74',
    status: 'ACTIVE',
    dp_amount: 500000,
    total_estimated_cost: 10000000,
    qc_status: 'PASS',
    allocation_status: 'FULL',
    qc_inspections: [{ status: 'PASS', inspected_at: '2026-10-25T10:00:00Z' }],
    invoices: [],
    inventory_transactions: [],
    spk_amendments: [],
  };

  const initialDpHistory: billingService.DPHistoryRecord[] = [
    {
      spk_id: 'spk-uuid-8209',
      spk_no: 'SPK-8209',
      customer_name: 'PT Karoseri Mitra Jaya',
      vehicle_plate: 'L 8209 AA',
      vehicle_vin: 'VIN-8209-XYZ',
      vehicle_model: 'Mitsubishi Colt Diesel FE 74',
      total_contract_estimate: 10000000,
      dp_amount: 500000,
      payment_method: 'Transfer Bank BCA',
      notes: 'DP Awal Kontrak',
      payment_date: '2026-10-20T10:00:00Z',
    },
  ];

  let mockAdjustmentsList: billingService.DpAdjustment[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    mockAdjustmentsList = [];
    mockSpk8209.dp_amount = 500000;
    initialDpHistory[0].dp_amount = 500000;

    vi.spyOn(billingService, 'fetchDPHistory').mockResolvedValue(initialDpHistory);
    vi.spyOn(billingService, 'fetchDpHistory').mockResolvedValue([mockSpk8209] as any);
    vi.spyOn(billingService, 'fetchDpAdjustments').mockImplementation(async () => mockAdjustmentsList);
    vi.spyOn(billingService, 'fetchApprovedChangeOrders').mockResolvedValue([]);

    const mockSelectSpk = vi.fn().mockReturnValue({
      neq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [mockSpk8209],
          error: null,
        }),
      }),
    });

    const mockInsertAdjustment = vi.fn().mockImplementation((payload) => {
      const createdAdj: billingService.DpAdjustment = {
        id: 'adj-uuid-101',
        spk_id: payload.spk_id,
        spk_no: payload.spk_no,
        old_amount: payload.old_amount,
        new_amount: payload.new_amount,
        difference: payload.difference,
        reason: payload.reason,
        adjusted_by_user_id: payload.adjusted_by_user_id,
        adjusted_by_name: payload.adjusted_by_name,
        adjusted_by_role: payload.adjusted_by_role,
        created_at: '2026-10-30T09:12:00Z',
      };
      mockAdjustmentsList.unshift(createdAdj);
      return {
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: createdAdj,
            error: null,
          }),
        }),
      };
    });

    const mockUpdateSpk = vi.fn().mockImplementation((payload) => {
      if (payload?.dp_amount) {
        mockSpk8209.dp_amount = payload.dp_amount;
        initialDpHistory[0].dp_amount = payload.dp_amount;
      }
      return {
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        or: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    const mockGeneric = {
      select: vi.fn().mockReturnThis(),
      insert: mockInsertAdjustment,
      update: mockUpdateSpk,
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'spk') {
        return {
          select: mockSelectSpk,
          update: mockUpdateSpk,
        } as any;
      }
      if (table === 'dp_adjustments') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
          insert: mockInsertAdjustment,
        } as any;
      }
      return mockGeneric as any;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('completes the entire DP Correction lifecycle with immutable audit trail and updates Final Bill', async () => {
    render(<KasirDashboard />);

    // 1. Buka /kasir -> Tab Penerimaan DP -> Sub-tab Riwayat DP
    const riwayatDpTab = await screen.findByRole('button', { name: /^Riwayat DP$/i });
    fireEvent.click(riwayatDpTab);

    // 2. Pilih SPK-8209 di daftar panel kiri
    await waitFor(() => {
      expect(screen.getByText('Daftar SPK DP Lunas')).toBeInTheDocument();
    });

    const spkCardLeft = screen.getAllByText('SPK-8209')[0];
    fireEvent.click(spkCardLeft);

    // 3. Verifikasi heading "Rincian DP: SPK-8209" dan nilai awal Rp 500.000
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'Rincian DP: SPK-8209' })).toBeInTheDocument();
    });
    expect(screen.getAllByText('Rp 500.000').length).toBeGreaterThanOrEqual(1);

    // 4. Klik tombol "Koreksi DP"
    const koreksiBtn = screen.getByRole('button', { name: /Koreksi DP/i });
    fireEvent.click(koreksiBtn);

    // 5. Modal dialog EditDpModal muncul
    await waitFor(() => {
      expect(screen.getByText(/Koreksi Nominal Uang Muka \(DP\)/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Prinsip Audit Trail Permanen \(Immutable Log\)/i)).toBeInTheDocument();
    expect(screen.getAllByText('PT Karoseri Mitra Jaya').length).toBeGreaterThanOrEqual(1);

    // 6. Masukkan nominal baru Rp 1.500.000 dan alasan
    const newDpInput = screen.getByPlaceholderText(/Contoh: 1500000/i);
    fireEvent.change(newDpInput, { target: { value: '1500000' } });

    // Cek selisih koreksi otomatis (+ Rp 1.000.000)
    expect(screen.getByText('+ Rp 1.000.000')).toBeInTheDocument();

    const reasonInput = screen.getByPlaceholderText(/bukti transfer mutasi/i);
    fireEvent.change(reasonInput, {
      target: { value: 'Koreksi salah ketik kasir, sesuai bukti mutasi BCA' },
    });

    // 7. Simpan koreksi
    const submitBtn = screen.getByRole('button', { name: /Simpan Koreksi DP/i });
    expect(submitBtn).toBeEnabled();
    fireEvent.click(submitBtn);

    // 8. Verifikasi Anti-Dispute di UI:
    // Modal tertutup
    await waitFor(() => {
      expect(screen.queryByText(/Koreksi Nominal Uang Muka \(DP\)/i)).not.toBeInTheDocument();
    });

    // Nilai nominal DP terbayar pada kartu langsung berubah menjadi Rp 1.500.000
    await waitFor(() => {
      expect(screen.getAllByText('Rp 1.500.000').length).toBeGreaterThanOrEqual(1);
    });

    // Badge peringatan Terkoreksi (1x) langsung muncul
    const terkoreksiBadges = screen.getAllByText(/Terkoreksi \(1x\)/i);
    expect(terkoreksiBadges.length).toBeGreaterThanOrEqual(1);

    // Panel Riwayat Koreksi Nominal DP langsung muncul di bawah kartu
    expect(screen.getByText(/Riwayat Koreksi Nominal DP \(1x\)/i)).toBeInTheDocument();
    expect(screen.getAllByText('Dewi Kasir').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Koreksi salah ketik kasir, sesuai bukti mutasi BCA/i)).toBeInTheDocument();
    expect(screen.getByText('Rp 500.000')).toHaveClass('line-through');

    // 9. Verifikasi Sisa Tagihan Pelunasan di tab "Pelunasan Akhir" (FINAL):
    const pelunasanAkhirTab = screen.getByRole('button', { name: /Pelunasan Akhir/i });
    fireEvent.click(pelunasanAkhirTab);

    // Pilih SPK-8209 di tab Pelunasan Akhir
    const spkCardFinal = screen.getAllByText('SPK-8209')[0];
    fireEvent.click(spkCardFinal);

    // Pada Billing Calculator:
    // Total Harga Jual: Rp 10.000.000
    // Uang Muka (DP): - Rp 1.500.000
    // Final Bill to Customer: Rp 8.500.000 (10.000.000 - 1.500.000)
    await waitFor(() => {
      expect(screen.getByText('Final Bill to Customer')).toBeInTheDocument();
    });
    expect(screen.getByText('Rp 8.500.000')).toBeInTheDocument();
  });
});
