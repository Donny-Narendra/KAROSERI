import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DpReceiptPrintModal, type DpReceiptData } from '../DpReceiptPrintModal';

const mockSave = vi.fn().mockResolvedValue(undefined);
const mockFrom = vi.fn().mockReturnValue({ save: mockSave });
const mockSet = vi.fn().mockReturnValue({ from: mockFrom });
const mockHtml2PdfWorker = vi.fn().mockReturnValue({ set: mockSet });

vi.mock('html2pdf.js', () => {
  return {
    default: () => mockHtml2PdfWorker(),
  };
});

describe('Component: DpReceiptPrintModal', () => {
  const mockData: DpReceiptData = {
    spkNo: 'SPK-8698',
    customerName: 'PT. Grosir Murah Kediri',
    vehiclePlate: 'AG 9988 GK',
    vehicleModel: 'Hino Dutro 130 HD - Box Pendingin',
    vehicleVin: 'MHFC130HD889900',
    paymentDate: '2026-10-20T14:30:00Z',
    receiptNo: 'DP/SPK-8698/20261020',
    totalContractEstimate: 120000000,
    dpAmount: 50000000,
    paymentMethod: 'Transfer Bank',
    notes: 'Transfer BCA an Donny, Ref: TRF-889911',
    cashierName: 'Kasir Sari',
  };

  beforeEach(() => {
    // Setup #print-root in document if not present
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

  it('does not render anything when isOpen is false', () => {
    const { container } = render(
      <DpReceiptPrintModal
        isOpen={false}
        onClose={vi.fn()}
        data={mockData}
      />
    );

    expect(screen.queryByText(/BUKTI PENERIMAAN UANG MUKA/i)).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('does not render anything when data is null', () => {
    const { container } = render(
      <DpReceiptPrintModal
        isOpen={true}
        onClose={vi.fn()}
        data={null}
      />
    );

    expect(screen.queryByText(/BUKTI PENERIMAAN UANG MUKA/i)).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders official RobelKaroseri kop, receipt number, and customer information', () => {
    render(
      <DpReceiptPrintModal
        isOpen={true}
        onClose={vi.fn()}
        data={mockData}
      />
    );

    // Kop & Heading
    expect(screen.getAllByText(/ROBELKAROSERI/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/PT ROBEL KAROSERI INDONESIA/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/BUKTI PENERIMAAN UANG MUKA \(INVOICE DP\)/i)).toBeInTheDocument();
    expect(screen.getByText('DP/SPK-8698/20261020')).toBeInTheDocument();

    // Customer & SPK Info
    expect(screen.getAllByText('PT. Grosir Murah Kediri')[0]).toBeInTheDocument();
    expect(screen.getAllByText('SPK-8698')[0]).toBeInTheDocument();
    expect(screen.getByText('AG 9988 GK')).toBeInTheDocument();
    expect(screen.getByText(/Hino Dutro 130 HD/i)).toBeInTheDocument();
  });

  it('renders payment details, formatted rupiah, and terbilang Indonesian words', () => {
    render(
      <DpReceiptPrintModal
        isOpen={true}
        onClose={vi.fn()}
        data={mockData}
      />
    );

    // Estimasi Nilai Kontrak (120 jt)
    expect(screen.getByText('Rp 120.000.000')).toBeInTheDocument();

    // DP Dibayarkan (50 jt)
    expect(screen.getByText('Rp 50.000.000')).toBeInTheDocument();

    // Terbilang
    expect(screen.getByText(/Lima Puluh Juta Rupiah/i)).toBeInTheDocument();

    // Metode Pembayaran & Catatan
    expect(screen.getByText('Transfer Bank')).toBeInTheDocument();
    expect(screen.getByText('Transfer BCA an Donny, Ref: TRF-889911')).toBeInTheDocument();

    // Sisa Tagihan (120jt - 50jt = 70jt)
    expect(screen.getByText('Rp 70.000.000')).toBeInTheDocument();

    // Tanda Tangan
    expect(screen.getByText('Kasir Sari')).toBeInTheDocument();
    expect(screen.getByText(/Kasir Penerima Pembayaran/i)).toBeInTheDocument();
    expect(screen.getByText(/Pihak Penyetor \(Konsumen\)/i)).toBeInTheDocument();
  });

  it('triggers window.print when Cetak Kuitansi button is clicked', () => {
    render(
      <DpReceiptPrintModal
        isOpen={true}
        onClose={vi.fn()}
        data={mockData}
      />
    );

    const printButton = screen.getByRole('button', { name: /Cetak Kuitansi/i });
    fireEvent.click(printButton);

    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('renders responsive modal structure with max-h-[92vh] card, scrollable container, and printable sheet', () => {
    render(
      <DpReceiptPrintModal
        isOpen={true}
        onClose={vi.fn()}
        data={mockData}
      />
    );

    const backdrop = document.getElementById('dp-receipt-modal-backdrop');
    expect(backdrop).toBeInTheDocument();
    expect(backdrop).toHaveClass('overflow-y-auto');

    const card = backdrop?.querySelector('.max-h-\\[92vh\\]');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('flex-col');

    const scrollContainer = card?.querySelector('.overflow-y-auto');
    expect(scrollContainer).toBeInTheDocument();

    const sheet = document.getElementById('printable-dp-receipt');
    expect(sheet).toBeInTheDocument();
    expect(sheet).toHaveAttribute('data-id', 'printable-dp-receipt');
    expect(sheet).toHaveClass('min-h-[297mm]');
    expect(sheet).toHaveClass('h-auto');
    expect(sheet).toHaveClass('bg-white');
    expect(sheet).toHaveClass('text-slate-900');

    // Verify Syarat & Ketentuan and Signatures are strictly children inside the white sheet
    const terms = sheet?.querySelector('.bg-slate-50.border.border-slate-200') as HTMLElement | null;
    expect(terms).toBeInTheDocument();
    expect(sheet).toContainElement(terms);

    const signatureKasir = screen.getByText('Kasir Sari');
    const customerInstances = screen.getAllByText('PT. Grosir Murah Kediri');
    expect(sheet).toContainElement(signatureKasir);
    expect(sheet).toContainElement(customerInstances[1]);
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <DpReceiptPrintModal
        isOpen={true}
        onClose={handleClose}
        data={mockData}
      />
    );

    const closeButton = screen.getByTitle('Tutup Pratinjau');
    fireEvent.click(closeButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('triggers html2pdf download with sanitized options when Download PDF is clicked', async () => {
    mockHtml2PdfWorker.mockClear();
    mockSet.mockClear();
    mockFrom.mockClear();
    mockSave.mockClear();

    render(
      <DpReceiptPrintModal
        isOpen={true}
        onClose={vi.fn()}
        data={mockData}
      />
    );

    const downloadButton = screen.getByRole('button', { name: /Download PDF/i });
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(mockHtml2PdfWorker).toHaveBeenCalled();
    });

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'Kuitansi-DP-SPK-8698.pdf',
        margin: [8, 8, 8, 8],
        html2canvas: expect.objectContaining({
          scale: 2,
          useCORS: true,
          letterRendering: true,
          backgroundColor: '#ffffff',
          onclone: expect.any(Function),
        }),
      })
    );

    const passedOpt = mockSet.mock.calls[0][0];
    const dummyClonedDoc = document.implementation.createHTMLDocument();
    const dummyEl = dummyClonedDoc.createElement('div');
    dummyEl.id = 'printable-dp-receipt';
    dummyEl.style.boxShadow = '0 10px 15px rgba(0,0,0,0.5)';
    dummyClonedDoc.body.appendChild(dummyEl);

    // Call onclone to verify it safely strips box-shadow and attaches style proxy
    const dummyContractRow = dummyClonedDoc.createElement('div');
    dummyContractRow.className = 'row-total-kontrak';
    dummyClonedDoc.body.appendChild(dummyContractRow);

    const dummyRemainingRow = dummyClonedDoc.createElement('div');
    dummyRemainingRow.className = 'row-sisa-tagihan';
    dummyClonedDoc.body.appendChild(dummyRemainingRow);

    passedOpt.html2canvas.onclone(dummyClonedDoc);
    expect(dummyEl.style.boxShadow).toBe('none');
    // For standard Download PDF, the rows should NOT be removed
    expect(dummyClonedDoc.querySelector('.row-total-kontrak')).not.toBeNull();
    expect(dummyClonedDoc.querySelector('.row-sisa-tagihan')).not.toBeNull();
  });

  it('renders all three action buttons in the header: Download Kuitansi Ringkas, Download PDF, and Cetak Kuitansi', () => {
    render(
      <DpReceiptPrintModal
        isOpen={true}
        onClose={vi.fn()}
        data={mockData}
      />
    );

    const compactBtn = screen.getByRole('button', { name: /Download Kuitansi Ringkas/i });
    expect(compactBtn).toBeInTheDocument();
    expect(compactBtn).toHaveClass('bg-blue-600');
    expect(compactBtn).toHaveAttribute('title', 'Download kuitansi ringkas tanpa estimasi total kontrak & sisa tagihan');

    const fullBtn = screen.getByRole('button', { name: /Download PDF/i });
    expect(fullBtn).toBeInTheDocument();
    expect(fullBtn).toHaveClass('bg-emerald-600');

    const printBtn = screen.getByRole('button', { name: /Cetak Kuitansi/i });
    expect(printBtn).toBeInTheDocument();
    expect(printBtn).toHaveClass('bg-amber-600');
  });

  it('triggers html2pdf download with compact filename and removes contract & remaining rows onclone when Download Kuitansi Ringkas is clicked', async () => {
    mockHtml2PdfWorker.mockClear();
    mockSet.mockClear();
    mockFrom.mockClear();
    mockSave.mockClear();

    render(
      <DpReceiptPrintModal
        isOpen={true}
        onClose={vi.fn()}
        data={mockData}
      />
    );

    const compactDownloadBtn = screen.getByRole('button', { name: /Download Kuitansi Ringkas/i });
    fireEvent.click(compactDownloadBtn);

    await waitFor(() => {
      expect(mockHtml2PdfWorker).toHaveBeenCalled();
    });

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'Kuitansi-DP-Ringkas-SPK-8698.pdf',
        margin: [8, 8, 8, 8],
        html2canvas: expect.objectContaining({
          scale: 2,
          useCORS: true,
          letterRendering: true,
          backgroundColor: '#ffffff',
          onclone: expect.any(Function),
        }),
      })
    );

    const passedOpt = mockSet.mock.calls[0][0];
    const dummyClonedDoc = document.implementation.createHTMLDocument();
    const dummyEl = dummyClonedDoc.createElement('div');
    dummyEl.id = 'printable-dp-receipt';
    dummyClonedDoc.body.appendChild(dummyEl);

    const dummyContractRow = dummyClonedDoc.createElement('div');
    dummyContractRow.className = 'row-total-kontrak';
    dummyClonedDoc.body.appendChild(dummyContractRow);

    const dummyRemainingRow = dummyClonedDoc.createElement('div');
    dummyRemainingRow.className = 'row-sisa-tagihan';
    dummyClonedDoc.body.appendChild(dummyRemainingRow);

    // Call onclone to verify it safely strips box-shadow and removes compact rows
    passedOpt.html2canvas.onclone(dummyClonedDoc);
    expect(dummyEl.style.boxShadow).toBe('none');
    expect(dummyClonedDoc.querySelector('.row-total-kontrak')).toBeNull();
    expect(dummyClonedDoc.querySelector('.row-sisa-tagihan')).toBeNull();
  });

  it('hides total contract and remaining balance rows when isCompact prop is true', () => {
    render(
      <DpReceiptPrintModal
        isOpen={true}
        onClose={vi.fn()}
        data={mockData}
        isCompact={true}
      />
    );

    // Total contract & Remaining bill must NOT be in the document
    expect(screen.queryByText(/Total Estimasi Nilai Kontrak SPK/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sisa Estimasi Tagihan Pelunasan/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Rp 120.000.000')).not.toBeInTheDocument();
    expect(screen.queryByText('Rp 70.000.000')).not.toBeInTheDocument();

    // DP Dibayarkan, Terbilang, Metode Bayar, Catatan must remain present
    expect(screen.getByText(/Nominal Uang Muka \(DP\) Dibayarkan/i)).toBeInTheDocument();
    expect(screen.getByText('Rp 50.000.000')).toBeInTheDocument();
    expect(screen.getByText(/Lima Puluh Juta Rupiah/i)).toBeInTheDocument();
    expect(screen.getByText('Transfer Bank')).toBeInTheDocument();
    expect(screen.getByText('Transfer BCA an Donny, Ref: TRF-889911')).toBeInTheDocument();
  });

  it('falls back gracefully to window.print when html2pdf throws an error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSave.mockRejectedValueOnce(new Error('CSSParsedDeclaration: unsupported color function oklch'));

    render(
      <DpReceiptPrintModal
        isOpen={true}
        onClose={vi.fn()}
        data={mockData}
      />
    );

    const downloadButton = screen.getByRole('button', { name: /Download PDF/i });
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(window.print).toHaveBeenCalled();
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Gagal mengunduh dokumen kuitansi DP via html2pdf:'),
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });
});

