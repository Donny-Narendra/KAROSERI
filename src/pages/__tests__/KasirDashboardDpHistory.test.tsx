import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { KasirDashboard } from '../KasirDashboard';
import { supabase } from '../../lib/supabaseClient';
import * as billingService from '../../services/billingService';

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

describe('Component: KasirDashboard (DP History Sub-Tab & Printable Receipt)', () => {
  const mockSpks = [
    {
      id: 'spk-uuid-8698',
      spk_no: 'SPK-8698',
      customer_name: 'PT. Grosir Murah Kediri',
      vehicle_plate: 'AG 9988 GK',
      vehicle_vin: 'MHFC130HD889900',
      vehicle_number: 'AG 9988 GK',
      vehicle_engine: 'ENG-8698',
      vehicle_model: 'Hino Dutro 130 HD',
      status: 'ACTIVE',
      dp_amount: 2165000,
      total_estimated_cost: 150000000,
      qc_status: 'PENDING',
      allocation_status: 'FULL',
      qc_inspections: [],
      invoices: [],
      inventory_transactions: [],
      spk_amendments: [],
    },
    {
      id: 'spk-uuid-6170',
      spk_no: 'SPK-6170',
      customer_name: 'PT Surya Kencana Trans',
      vehicle_plate: 'B 8769 TER',
      vehicle_vin: 'MH65876',
      vehicle_number: 'B 8769 TER',
      vehicle_engine: 'ENG-6170',
      vehicle_model: 'Mitsubishi Canter FE 74 HD',
      status: 'ACTIVE',
      dp_amount: 2165000,
      total_estimated_cost: 120000000,
      qc_status: 'PENDING',
      allocation_status: 'FULL',
      qc_inspections: [],
      invoices: [],
      inventory_transactions: [],
      spk_amendments: [],
    },
  ];

  const mockDpHistory: billingService.DPHistoryRecord[] = [
    {
      spk_id: 'spk-uuid-8698',
      spk_no: 'SPK-8698',
      customer_name: 'PT. Grosir Murah Kediri',
      vehicle_plate: 'AG 9988 GK',
      vehicle_vin: 'MHFC130HD889900',
      vehicle_model: 'Hino Dutro 130 HD',
      total_contract_estimate: 150000000,
      dp_amount: 2165000,
      payment_method: 'Transfer BCA',
      notes: 'Uang Muka 15% Invoice DP #8698',
      payment_date: '2026-10-20T10:00:00Z',
    },
    {
      spk_id: 'spk-uuid-6170',
      spk_no: 'SPK-6170',
      customer_name: 'PT Surya Kencana Trans',
      vehicle_plate: 'B 8769 TER',
      vehicle_vin: 'MH65876',
      vehicle_model: 'Mitsubishi Canter FE 74 HD',
      total_contract_estimate: 120000000,
      dp_amount: 2165000,
      payment_method: 'Transfer Mandiri',
      notes: 'DP Tahap 1',
      payment_date: '2026-10-20T09:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    if (!document.getElementById('print-root')) {
      const printRoot = document.createElement('div');
      printRoot.id = 'print-root';
      document.body.appendChild(printRoot);
    }

    vi.spyOn(billingService, 'fetchDPHistory').mockResolvedValue(mockDpHistory);
    vi.spyOn(billingService, 'fetchDpHistory').mockResolvedValue(mockSpks as any);
    vi.spyOn(window, 'print').mockImplementation(() => {});

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    const mockSelectSpk = vi.fn().mockReturnValue({
      neq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: mockSpks,
          error: null,
        }),
      }),
    });

    const mockChain: any = {
      eq: vi.fn(() => mockChain),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
    };

    const mockSelectGeneric = vi.fn().mockReturnValue(mockChain);

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'spk') {
        return { select: mockSelectSpk } as any;
      }
      return { select: mockSelectGeneric } as any;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('navigates to sub-tab "Riwayat DP" and renders left panel list and right panel transactions', async () => {
    render(<KasirDashboard />);

    // Click sub-tab "Riwayat DP"
    const riwayatDpTab = await screen.findByRole('button', { name: /^Riwayat DP$/i });
    fireEvent.click(riwayatDpTab);

    // Left panel renders "Daftar SPK DP Lunas"
    await waitFor(() => {
      expect(screen.getByText('Daftar SPK DP Lunas')).toBeInTheDocument();
    });

    // Left panel contains SPK cards with "DP LUNAS"
    const dpLunasBadges = screen.getAllByText('DP LUNAS');
    expect(dpLunasBadges.length).toBeGreaterThanOrEqual(2);

    // Right panel displays Riwayat DP Diterima
    expect(screen.getByRole('heading', { level: 2, name: 'Riwayat DP Diterima' })).toBeInTheDocument();

    // SPK-8698 details are rendered
    expect(screen.getAllByText('SPK-8698')[0]).toBeInTheDocument();
    expect(screen.getByText(/PT\. Grosir Murah Kediri — AG 9988 GK/i)).toBeInTheDocument();
    expect(screen.getAllByText('Rp 2.165.000')[0]).toBeInTheDocument();

    // Status badge is DITERIMA / AKTIF
    const activeBadges = screen.getAllByText('DITERIMA / AKTIF');
    expect(activeBadges.length).toBeGreaterThanOrEqual(1);

    // Action buttons are present
    expect(screen.getAllByRole('button', { name: /Cetak Kuitansi DP/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Salin Link Tracking/i })[0]).toBeInTheDocument();
  });

  it('copies tracking link when "Salin Link Tracking" is clicked', async () => {
    render(<KasirDashboard />);

    const riwayatDpTab = await screen.findByRole('button', { name: /^Riwayat DP$/i });
    fireEvent.click(riwayatDpTab);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Salin Link Tracking/i })[0]).toBeInTheDocument();
    });

    const copyBtn = screen.getAllByRole('button', { name: /Salin Link Tracking/i })[0];
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('/tracking/SPK-8698')
    );
  });

  it('opens DpReceiptPrintModal when "Cetak Kuitansi DP" is clicked and verifies uncropped modal content', async () => {
    render(<KasirDashboard />);

    const riwayatDpTab = await screen.findByRole('button', { name: /^Riwayat DP$/i });
    fireEvent.click(riwayatDpTab);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Cetak Kuitansi DP/i })[0]).toBeInTheDocument();
    });

    const printBtn = screen.getAllByRole('button', { name: /Cetak Kuitansi DP/i })[0];
    fireEvent.click(printBtn);

    // Modal opens with DP invoice title
    await waitFor(() => {
      expect(screen.getByText(/BUKTI PENERIMAAN UANG MUKA \(INVOICE DP\)/i)).toBeInTheDocument();
    });

    // Check S&K text box
    expect(screen.getByText(/Syarat & Ketentuan Uang Muka \(DP\):/i)).toBeInTheDocument();
    expect(screen.getByText(/Dokumen ini merupakan tanda terima sah atas pembayaran uang muka/i)).toBeInTheDocument();

    // Check signature columns
    expect(screen.getByText(/Kasir Penerima Pembayaran,/i)).toBeInTheDocument();
    expect(screen.getByText(/Pihak Penyetor \(Konsumen\),/i)).toBeInTheDocument();
    expect(screen.getByText(/Kasir Keuangan Bengkel/i)).toBeInTheDocument();

    // Close preview
    const closeBtn = screen.getByTitle('Tutup Pratinjau');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText(/BUKTI PENERIMAAN UANG MUKA \(INVOICE DP\)/i)).not.toBeInTheDocument();
    });
  });

  it('filters right panel when an SPK is selected from the left panel and allows resetting', async () => {
    render(<KasirDashboard />);

    const riwayatDpTab = await screen.findByRole('button', { name: /^Riwayat DP$/i });
    fireEvent.click(riwayatDpTab);

    await waitFor(() => {
      expect(screen.getByText('Daftar SPK DP Lunas')).toBeInTheDocument();
    });

    // Click SPK-8698 card in left panel
    const leftPanelCard = screen.getAllByText('SPK-8698')[0];
    fireEvent.click(leftPanelCard);

    // Header reflects selected SPK
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'Rincian DP: SPK-8698' })).toBeInTheDocument();
    });

    // Button to reset is available
    const resetBtn = screen.getByRole('button', { name: /Tampilkan Semua Transaksi/i });
    expect(resetBtn).toBeInTheDocument();

    // Click reset
    fireEvent.click(resetBtn);

    // Returns to all transactions
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'Riwayat DP Diterima' })).toBeInTheDocument();
    });
  });

  it('displays "Tautan Pelacakan Kedaluwarsa (>7 Hari)" in billing calculator when SPK was released more than 7 days ago', async () => {
    const expiredSpk = {
      ...mockSpks[0],
      id: 'spk-uuid-expired',
      spk_no: 'SPK-EXP-999',
      status: 'COMPLETED',
      released_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'spk') {
        return {
          select: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [expiredSpk],
            error: null,
          }),
        } as any;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any;
    });

    render(<KasirDashboard />);

    // Switch to FINAL tab
    const finalTab = await screen.findByRole('button', { name: /Pelunasan Akhir/i });
    fireEvent.click(finalTab);

    // Select the SPK
    const spkCard = await screen.findByText('SPK-EXP-999');
    fireEvent.click(spkCard);

    // Verify expiration indicator badge is rendered
    await waitFor(() => {
      expect(screen.getByText('Tautan Pelacakan Kedaluwarsa (>7 Hari)')).toBeInTheDocument();
    });
  });

  it('displays DRAFT SPK with PARTIAL allocation in Menunggu DP and isolates it from paid ACTIVE SPK on same vehicle plate', async () => {
    const spk4417Draft = {
      id: 'spk-uuid-4417',
      spk_no: 'SPK-4417',
      customer_name: 'CUPLIZ SQUAD',
      vehicle_plate: 'DK 8021 XX',
      vehicle_vin: 'MHFC4417',
      vehicle_number: 'DK 8021 XX',
      vehicle_engine: 'ENG-4417',
      vehicle_model: 'Variasi Truk Canter',
      status: 'DRAFT',
      dp_amount: 0,
      total_estimated_cost: 35000000,
      qc_status: 'PENDING',
      allocation_status: 'PARTIAL', // Crucial: was previously filtered out!
      qc_inspections: [],
      invoices: [],
      inventory_transactions: [],
      spk_amendments: [],
    };

    const spk9519Active = {
      id: 'spk-uuid-9519',
      spk_no: 'SPK-9519',
      customer_name: 'CUPLIZ SQUAD',
      vehicle_plate: 'DK 8021 XX',
      vehicle_vin: 'MHFC9519',
      vehicle_number: 'DK 8021 XX',
      vehicle_engine: 'ENG-9519',
      vehicle_model: 'Bak Truk Kayu',
      status: 'ACTIVE',
      dp_amount: 5000000,
      total_estimated_cost: 50000000,
      qc_status: 'PENDING',
      allocation_status: 'COMPLETE',
      qc_inspections: [],
      invoices: [],
      inventory_transactions: [],
      spk_amendments: [],
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'spk') {
        return {
          select: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [spk4417Draft, spk9519Active],
            error: null,
          }),
        } as any;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any;
    });

    render(<KasirDashboard />);

    // In Menunggu DP tab: SPK-4417 MUST be visible
    expect(await screen.findByText('SPK-4417')).toBeInTheDocument();
    expect(screen.getByText('Variasi Truk Canter')).toBeInTheDocument();

    // SPK-9519 is ACTIVE with DP paid, so it MUST NOT be in Menunggu DP
    expect(screen.queryByText('SPK-9519')).not.toBeInTheDocument();

    // Now switch to Riwayat DP sub-tab: SPK-9519 MUST be visible
    const riwayatDpBtn = screen.getByRole('button', { name: /Riwayat DP/i });
    fireEvent.click(riwayatDpBtn);

    expect(await screen.findByText('SPK-9519')).toBeInTheDocument();
    expect(screen.queryByText('SPK-4417')).not.toBeInTheDocument();
  });

  it('displays multiple unpaid DRAFT/PENDING_PAYMENT SPKs with the same vehicle plate independently in Menunggu DP', async () => {
    const spk1 = {
      id: 'spk-uuid-1',
      spk_no: 'SPK-4417',
      customer_name: 'CUPLIZ SQUAD',
      vehicle_plate: 'DK 8021 XX',
      vehicle_vin: 'MHFC4417',
      vehicle_number: 'DK 8021 XX',
      vehicle_model: 'Variasi Truk Canter',
      status: 'DRAFT',
      dp_amount: 0,
      total_estimated_cost: 35000000,
      qc_status: 'PENDING',
      allocation_status: 'PARTIAL',
      qc_inspections: [],
      invoices: [],
      inventory_transactions: [],
      spk_amendments: [],
    };

    const spk2 = {
      id: 'spk-uuid-2',
      spk_no: 'SPK-9519',
      customer_name: 'CUPLIZ SQUAD',
      vehicle_plate: 'DK 8021 XX',
      vehicle_vin: 'MHFC9519',
      vehicle_number: 'DK 8021 XX',
      vehicle_model: 'Bak Truk Kayu',
      status: 'PENDING_PAYMENT',
      dp_amount: null,
      total_estimated_cost: 50000000,
      qc_status: 'PENDING',
      allocation_status: null,
      qc_inspections: [],
      invoices: [],
      inventory_transactions: [],
      spk_amendments: [],
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'spk') {
        return {
          select: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [spk1, spk2],
            error: null,
          }),
        } as any;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any;
    });

    render(<KasirDashboard />);

    // Both SPKs must appear independently in Menunggu DP without grouping or deduplication
    expect(await screen.findByText('SPK-4417')).toBeInTheDocument();
    expect(await screen.findByText('SPK-9519')).toBeInTheDocument();
    expect(screen.getByText('Variasi Truk Canter')).toBeInTheDocument();
    expect(screen.getByText('Bak Truk Kayu')).toBeInTheDocument();
  });
});
