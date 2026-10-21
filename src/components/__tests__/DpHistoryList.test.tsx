import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DpHistoryList } from '../DpHistoryList';
import type { DPHistoryRecord } from '../../services/billingService';

describe('Component: DpHistoryList (Printable DP Receipt Integration)', () => {
  const mockHistory: DPHistoryRecord[] = [
    {
      spk_id: 'spk-uuid-8698',
      spk_no: 'SPK-8698',
      customer_name: 'PT. Grosir Murah Kediri',
      vehicle_plate: 'AG 9988 GK',
      vehicle_vin: 'MHFC130HD889900',
      vehicle_model: 'Hino Dutro 130 HD',
      total_contract_estimate: 120000000,
      dp_amount: 50000000,
      payment_method: 'Transfer Bank',
      notes: 'Transfer BCA an Donny',
      payment_date: '2026-10-20T14:30:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    if (!document.getElementById('print-root')) {
      const printRoot = document.createElement('div');
      printRoot.id = 'print-root';
      document.body.appendChild(printRoot);
    }
    vi.spyOn(window, 'print').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading indicator when loading is true', () => {
    render(<DpHistoryList history={[]} loading={true} />);
    expect(screen.getByText('Memuat riwayat DP...')).toBeInTheDocument();
  });

  it('renders empty notice when history is empty', () => {
    render(<DpHistoryList history={[]} loading={false} />);
    expect(screen.getByText('Tidak ada riwayat pembayaran DP.')).toBeInTheDocument();
  });

  it('renders DP history records with customer and payment information', () => {
    render(<DpHistoryList history={mockHistory} loading={false} />);

    expect(screen.getByText('SPK-8698')).toBeInTheDocument();
    expect(screen.getByText(/PT. Grosir Murah Kediri — AG 9988 GK/i)).toBeInTheDocument();
    expect(screen.getByText('Rp 50.000.000')).toBeInTheDocument();
    expect(screen.getByText('Transfer Bank')).toBeInTheDocument();
    expect(screen.getByText('Transfer BCA an Donny')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cetak Kuitansi DP/i })).toBeInTheDocument();
  });

  it('opens DpReceiptPrintModal when "Cetak Kuitansi DP" button is clicked', () => {
    render(<DpHistoryList history={mockHistory} loading={false} />);

    const printBtn = screen.getByRole('button', { name: /Cetak Kuitansi DP/i });
    fireEvent.click(printBtn);

    // Verify DpReceiptPrintModal is rendered with Kop and receipt data
    expect(screen.getByText(/BUKTI PENERIMAAN UANG MUKA \(INVOICE DP\)/i)).toBeInTheDocument();
    expect(screen.getByText('DP/SPK-8698/20261020')).toBeInTheDocument();
    expect(screen.getAllByText('PT. Grosir Murah Kediri')[0]).toBeInTheDocument();
    expect(screen.getByText(/Lima Puluh Juta Rupiah/i)).toBeInTheDocument();

    // Verify window.print trigger
    const printModalBtn = screen.getByRole('button', { name: /^Cetak Kuitansi$/i });
    fireEvent.click(printModalBtn);
    expect(window.print).toHaveBeenCalledTimes(1);

    // Close preview
    const closeBtn = screen.getByTitle('Tutup Pratinjau');
    fireEvent.click(closeBtn);

    expect(screen.queryByText(/BUKTI PENERIMAAN UANG MUKA \(INVOICE DP\)/i)).not.toBeInTheDocument();
  });

  it('renders "Kedaluwarsa (Pasca-BAST)" badge when vehicle was released more than 7 days ago', () => {
    const expiredHistory: DPHistoryRecord[] = [
      {
        ...mockHistory[0],
        spk_no: 'SPK-EXPIRED-7D',
        released_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    render(<DpHistoryList history={expiredHistory} loading={false} />);

    expect(screen.getByText('Kedaluwarsa (Pasca-BAST)')).toBeInTheDocument();
  });

  it('renders active grace period badge when vehicle was released less than 7 days ago', () => {
    const activeReleasedHistory: DPHistoryRecord[] = [
      {
        ...mockHistory[0],
        spk_no: 'SPK-ACTIVE-3D',
        released_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    render(<DpHistoryList history={activeReleasedHistory} loading={false} />);

    expect(screen.getByText(/4h Aktif/i)).toBeInTheDocument();
  });
});
