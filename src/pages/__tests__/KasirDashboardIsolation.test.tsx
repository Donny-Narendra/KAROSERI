import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { KasirDashboard } from '../KasirDashboard';
import { supabase } from '../../lib/supabaseClient';
import * as billingService from '../../services/billingService';
import { DownPaymentModal } from '../../components/DownPaymentModal';
import { EditDpModal } from '../../components/finance/EditDpModal';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'kasir-user-id', email: 'kasir@robelkaroseri.com' },
    profile: { id: 'kasir-user-id', full_name: 'Dewi Kasir', role: 'kasir' },
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

describe('Page: KasirDashboard (Exclusion of Hidden and Test SPKs)', () => {
  const mockMixedSpks = [
    // 1. Valid operational pending DP SPK
    {
      id: 'spk-pending-valid',
      spk_no: 'SPK-OP-PENDING',
      customer_name: 'PT Operasional Sah',
      vehicle_plate: 'B 1000 OP',
      vehicle_vin: 'VIN-1000',
      vehicle_model: 'Hino Dutro',
      status: 'DRAFT',
      dp_amount: 0,
      total_estimated_cost: 50000000,
      qc_status: 'PENDING',
      is_hidden: false,
      is_test: false,
      qc_inspections: [],
      invoices: [],
      inventory_transactions: [],
      spk_amendments: [],
    },
    // 2. Hidden pending DP SPK (must be excluded)
    {
      id: 'spk-pending-hidden',
      spk_no: 'SPK-HIDDEN-PENDING',
      customer_name: 'CV Hidden Pending',
      vehicle_plate: 'B 9999 HD',
      vehicle_vin: 'VIN-HIDDEN-1',
      vehicle_model: 'Mitsubishi Canter',
      status: 'DRAFT',
      dp_amount: 0,
      total_estimated_cost: 40000000,
      qc_status: 'PENDING',
      is_hidden: true,
      is_test: false,
      qc_inspections: [],
      invoices: [],
      inventory_transactions: [],
      spk_amendments: [],
    },
    // 3. Test pending DP SPK (must be excluded)
    {
      id: 'spk-pending-test',
      spk_no: 'SPK-TEST-PENDING',
      customer_name: 'Unit Test Pending',
      vehicle_plate: 'B 8888 TS',
      vehicle_vin: 'VIN-TEST-1',
      vehicle_model: 'Isuzu Giga',
      status: 'PENDING_PAYMENT',
      dp_amount: 0,
      total_estimated_cost: 30000000,
      qc_status: 'PENDING',
      is_hidden: false,
      is_test: true,
      qc_inspections: [],
      invoices: [],
      inventory_transactions: [],
      spk_amendments: [],
    },
    // 4. Valid operational paid DP SPK (ACTIVE)
    {
      id: 'spk-paid-valid',
      spk_no: 'SPK-OP-PAID',
      customer_name: 'PT Angkutan Sah',
      vehicle_plate: 'B 2000 OP',
      vehicle_vin: 'VIN-2000',
      vehicle_model: 'Hino Ranger',
      status: 'ACTIVE',
      dp_amount: 15000000,
      total_estimated_cost: 150000000,
      qc_status: 'PASS',
      is_hidden: false,
      is_test: false,
      qc_inspections: [{ status: 'PASS' }],
      invoices: [],
      inventory_transactions: [],
      spk_amendments: [],
    },
    // 5. Hidden paid DP SPK (must be excluded from history and billing queues)
    {
      id: 'spk-paid-hidden',
      spk_no: 'SPK-HIDDEN-PAID',
      customer_name: 'CV Hidden Paid',
      vehicle_plate: 'B 7777 HD',
      vehicle_vin: 'VIN-HIDDEN-2',
      vehicle_model: 'Fuso Fighter',
      status: 'ACTIVE',
      dp_amount: 20000000,
      total_estimated_cost: 200000000,
      qc_status: 'PASS',
      is_hidden: true,
      is_test: false,
      qc_inspections: [{ status: 'PASS' }],
      invoices: [],
      inventory_transactions: [],
      spk_amendments: [],
    },
    // 6. Test final billing SPK (must be excluded)
    {
      id: 'spk-final-test',
      spk_no: 'SPK-TEST-FINAL',
      customer_name: 'Uji Coba Penagihan',
      vehicle_plate: 'B 6666 TS',
      vehicle_vin: 'VIN-TEST-2',
      vehicle_model: 'Suzuki Carry',
      status: 'ACTIVE',
      dp_amount: 5000000,
      total_estimated_cost: 45000000,
      qc_status: 'PASS',
      is_hidden: false,
      is_test: true,
      qc_inspections: [{ status: 'PASS' }],
      invoices: [],
      inventory_transactions: [],
      spk_amendments: [],
    },
  ];

  let mockEqTest: any;
  let mockEqHidden: any;
  let mockNeqStatus: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockEqTest = vi.fn().mockImplementation((_col: string, _val: any) => ({
      order: vi.fn().mockResolvedValue({
        data: mockMixedSpks,
        error: null,
      }),
    }));

    mockEqHidden = vi.fn().mockImplementation((_col: string, _val: any) => ({
      eq: mockEqTest,
      order: vi.fn().mockResolvedValue({
        data: mockMixedSpks,
        error: null,
      }),
    }));

    mockNeqStatus = vi.fn().mockImplementation((_col: string, _val: any) => ({
      eq: mockEqHidden,
      order: vi.fn().mockResolvedValue({
        data: mockMixedSpks,
        error: null,
      }),
    }));

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'spk') {
        return {
          select: vi.fn().mockReturnValue({
            neq: mockNeqStatus,
          }),
        } as any;
      }
      if (table === 'rab_estimations' || table === 'rab_items') {
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        } as any;
      }
      if (table === 'dp_adjustments') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        } as any;
      }
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any;
    });

    vi.spyOn(billingService, 'fetchDPHistory').mockResolvedValue([
      {
        spk_id: 'spk-paid-valid',
        spk_no: 'SPK-OP-PAID',
        customer_name: 'PT Angkutan Sah',
        vehicle_plate: 'B 2000 OP',
        vehicle_vin: 'VIN-2000',
        vehicle_model: 'Hino Ranger',
        total_contract_estimate: 150000000,
        dp_amount: 15000000,
        payment_method: 'Transfer BCA',
        notes: 'DP Operasional Sah',
        payment_date: '2026-11-01T10:00:00Z',
      },
    ]);

    vi.spyOn(billingService, 'fetchDpAdjustments').mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sub-tab "Menunggu Pembayaran DP" excludes hidden and test SPKs', async () => {
    render(<KasirDashboard />);

    await waitFor(() => {
      expect(mockEqHidden).toHaveBeenCalledWith('is_hidden', false);
      expect(mockEqTest).toHaveBeenCalledWith('is_test', false);
    });

    // Valid operational pending SPK must be visible
    expect(await screen.findByText('SPK-OP-PENDING')).toBeInTheDocument();
    expect(screen.getByText('PT Operasional Sah')).toBeInTheDocument();

    // Hidden and test SPKs must NOT be visible
    expect(screen.queryByText('SPK-HIDDEN-PENDING')).not.toBeInTheDocument();
    expect(screen.queryByText('CV Hidden Pending')).not.toBeInTheDocument();
    expect(screen.queryByText('SPK-TEST-PENDING')).not.toBeInTheDocument();
    expect(screen.queryByText('Unit Test Pending')).not.toBeInTheDocument();
  });

  it('sub-tab "Riwayat DP Diterima" excludes hidden and test SPKs', async () => {
    render(<KasirDashboard />);

    await screen.findByText('SPK-OP-PENDING');

    // Switch to Riwayat DP
    const riwayatTabBtn = screen.getByRole('button', { name: /Riwayat DP/i });
    fireEvent.click(riwayatTabBtn);

    // Only non-hidden operational paid SPK should be in the list
    expect(await screen.findByText('SPK-OP-PAID')).toBeInTheDocument();
    expect(screen.getByText('PT Angkutan Sah')).toBeInTheDocument();

    // Hidden and test paid SPKs must NOT appear
    expect(screen.queryByText('SPK-HIDDEN-PAID')).not.toBeInTheDocument();
    expect(screen.queryByText('CV Hidden Paid')).not.toBeInTheDocument();
    expect(screen.queryByText('SPK-TEST-FINAL')).not.toBeInTheDocument();
  });

  it('tab "Pelunasan Akhir (Final Billing)" excludes hidden and test SPKs from queues', async () => {
    render(<KasirDashboard />);

    await screen.findByText('SPK-OP-PENDING');

    // Switch to Pelunasan Akhir
    const finalBillingTabBtn = screen.getByRole('button', { name: /Pelunasan Akhir/i });
    fireEvent.click(finalBillingTabBtn);

    // Valid operational paid/completed SPK should appear in final billing queue
    expect(await screen.findByText('SPK-OP-PAID')).toBeInTheDocument();

    // Hidden and test SPKs must NOT appear in final billing queue
    expect(screen.queryByText('SPK-HIDDEN-PAID')).not.toBeInTheDocument();
    expect(screen.queryByText('SPK-TEST-FINAL')).not.toBeInTheDocument();
    expect(screen.queryByText('Uji Coba Penagihan')).not.toBeInTheDocument();
  });

  it('blocks DP processing for an isolated SPK in DownPaymentModal', () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    render(
      <DownPaymentModal
        isOpen={true}
        onClose={handleClose}
        spk={{
          id: 'SPK-HIDDEN-TEST',
          dbId: 'uuid-hidden',
          customerName: 'Test Customer',
          vehiclePlate: 'B 1234 TEST',
          isHidden: true,
          isTest: false,
        }}
        suggestedAmount={10000000}
        onSuccess={handleSuccess}
      />
    );

    // Modal renders isolation notice and prevents DP entry
    expect(screen.getByText(/SPK Terisolasi/i)).toBeInTheDocument();
    expect(screen.getByText(/SPK ini telah diisolasi\/diarsipkan dan tidak dapat diproses pembayaran DP-nya/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Simpan Pembayaran/i })).not.toBeInTheDocument();

    // Clicking Tutup calls onClose
    const closeButtons = screen.getAllByRole('button', { name: /Tutup/i });
    fireEvent.click(closeButtons[0]);
    expect(handleClose).toHaveBeenCalled();
  });

  it('blocks DP adjustment for an isolated SPK in EditDpModal', () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    render(
      <EditDpModal
        isOpen={true}
        onClose={handleClose}
        spkId="uuid-test"
        spkNo="SPK-TEST-99"
        customerName="Test Customer"
        currentDp={5000000}
        isHidden={false}
        isTest={true}
        onSuccess={handleSuccess}
      />
    );

    // Modal renders isolation notice and prevents DP editing
    expect(screen.getByText(/SPK Terisolasi/i)).toBeInTheDocument();
    expect(screen.getByText(/SPK ini telah diisolasi\/diarsipkan dan nilai DP-nya tidak dapat diubah dari sistem operasional kasir/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Simpan Koreksi DP/i })).not.toBeInTheDocument();

    // Clicking Tutup calls onClose
    const closeButtons = screen.getAllByRole('button', { name: /Tutup/i });
    fireEvent.click(closeButtons[0]);
    expect(handleClose).toHaveBeenCalled();
  });
});
