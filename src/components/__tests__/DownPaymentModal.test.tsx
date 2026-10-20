import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DownPaymentModal } from '../DownPaymentModal';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Component: DownPaymentModal (DP Invoice Receipt Integration)', () => {
  const mockSpk = {
    id: 'SPK-8698',
    dbId: 'spk-uuid-8698',
    customerName: 'PT. Grosir Murah Kediri',
    vehiclePlate: 'AG 9988 GK',
    vehicleModel: 'Hino Dutro 130 HD',
    vehicleVin: 'MHFC130HD889900',
    status: 'DRAFT',
  };

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

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <DownPaymentModal
        isOpen={false}
        onClose={vi.fn()}
        spk={mockSpk}
        suggestedAmount={120000000}
        onSuccess={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders SPK details, suggested contract amount, and form fields', () => {
    render(
      <DownPaymentModal
        isOpen={true}
        onClose={vi.fn()}
        spk={mockSpk}
        suggestedAmount={120000000}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText('Terima Uang Muka (DP)')).toBeInTheDocument();
    expect(screen.getByText('SPK-8698')).toBeInTheDocument();
    expect(screen.getByText('PT. Grosir Murah Kediri')).toBeInTheDocument();
    expect(screen.getByText('Rp 120.000.000')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Simpan Pembayaran & Aktifkan SPK/i })).toBeInTheDocument();
  });

  it('validates invalid DP amount with a warning modal', async () => {
    render(
      <DownPaymentModal
        isOpen={true}
        onClose={vi.fn()}
        spk={mockSpk}
        suggestedAmount={0}
        onSuccess={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Masukkan jumlah DP');
    fireEvent.change(input, { target: { value: '0' } });

    const form = screen.getByRole('button', { name: /Simpan Pembayaran & Aktifkan SPK/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Nominal DP Tidak Valid')).toBeInTheDocument();
    });
  });

  it('successfully records DP and offers [ Cetak Bukti Bayar / Invoice DP ] and [ Selesai ] options', async () => {
    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'payments') {
        return { insert: mockInsert } as any;
      }
      if (table === 'spk') {
        return { update: mockUpdate } as any;
      }
      return {} as any;
    });

    render(
      <DownPaymentModal
        isOpen={true}
        onClose={handleClose}
        spk={mockSpk}
        suggestedAmount={120000000}
        onSuccess={handleSuccess}
      />
    );

    const amountInput = screen.getByPlaceholderText('Masukkan jumlah DP');
    fireEvent.change(amountInput, { target: { value: '50000000' } });

    const notesInput = screen.getByPlaceholderText(/Contoh: Transfer BCA/i);
    fireEvent.change(notesInput, { target: { value: 'Transfer BCA an Budi, Ref: 9988' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Simpan Pembayaran & Aktifkan SPK/i });
    fireEvent.click(submitBtn);

    // Initial Confirmation
    await waitFor(() => {
      expect(screen.getByText('Konfirmasi Penerimaan Uang Muka (DP)')).toBeInTheDocument();
    });

    const confirmSubmitBtn = screen.getByRole('button', { name: /Ya, Terima DP & Aktifkan SPK/i });
    fireEvent.click(confirmSubmitBtn);

    // Verify DB calls
    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith({
        spk_id: 'spk-uuid-8698',
        payment_type: 'DP',
        amount: 50000000,
        payment_method: 'Transfer Bank',
        notes: 'Transfer BCA an Budi, Ref: 9988',
      });
      expect(mockUpdate).toHaveBeenCalledWith({
        dp_amount: 50000000,
        status: 'ACTIVE',
      });
    });

    // Success dialog with [ Cetak Bukti Bayar / Invoice DP ] and [ Selesai ]
    await waitFor(() => {
      expect(screen.getByText('DP Berhasil Dicatat')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cetak Bukti Bayar \/ Invoice DP/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Selesai/i })).toBeInTheDocument();
    });

    // Click "Cetak Bukti Bayar / Invoice DP"
    const printReceiptBtn = screen.getByRole('button', { name: /Cetak Bukti Bayar \/ Invoice DP/i });
    fireEvent.click(printReceiptBtn);

    // Verify DpReceiptPrintModal opened
    await waitFor(() => {
      expect(screen.getByText(/BUKTI PENERIMAAN UANG MUKA \(INVOICE DP\)/i)).toBeInTheDocument();
      expect(screen.getByText('Rp 50.000.000')).toBeInTheDocument();
      expect(screen.getByText(/Lima Puluh Juta Rupiah/i)).toBeInTheDocument();
    });

    // Close preview
    const closePreviewBtn = screen.getByTitle('Tutup Pratinjau');
    fireEvent.click(closePreviewBtn);

    expect(handleSuccess).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
