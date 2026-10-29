import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PublicProgressTracking } from '../PublicProgressTracking';
import { supabase } from '../../lib/supabaseClient';
import { getOptimizedImageUrl } from '../../lib/cloudinary';

const mockSave = vi.fn().mockResolvedValue(undefined);
const mockFrom = vi.fn().mockReturnValue({ save: mockSave });
const mockSet = vi.fn().mockReturnValue({ from: mockFrom });
const mockHtml2PdfWorker = vi.fn().mockReturnValue({ set: mockSet });

vi.mock('html2pdf.js', () => {
  return {
    default: () => mockHtml2PdfWorker(),
  };
});

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../../lib/cloudinary', () => ({
  getOptimizedImageUrl: vi.fn((url: string, width?: number) => {
    return `${url}?transform=w_${width || 800}`;
  }),
}));

describe('Page: PublicProgressTracking (7-Day Post-BAST Expiration & Thank You State)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const setupSupabaseMock = (spkData: any, checklists: any[] = [], assets: any[] = []) => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'spk') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: spkData,
            error: null,
          }),
        } as any;
      }
      if (table === 'wbs_checklists') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: checklists,
            error: null,
          }),
        } as any;
      }
      if (table === 'spk_assets') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn().mockResolvedValue({
            data: assets,
            error: null,
          }),
        } as any;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any;
    });
  };

  it('renders normal WBS progress details and "Unduh PDF" button when vehicle is not yet released', async () => {
    const activeSpk = {
      id: 'spk-1',
      spk_no: 'SPK-2026-001',
      customer_name: 'PT. Trans Logistik Indonesia',
      vehicle_plate: 'B 1234 XYZ',
      vehicle_vin: 'MHF1234567890',
      status: 'ACTIVE',
      dp_amount: 50000000,
      released_at: null,
    };

    const mockChecklists = [
      { wbs_category: 'Pembongkaran', progress_percentage: 100, mandor_notes: 'Sasis bersih' },
      { wbs_category: 'Sasis/Rangka', progress_percentage: 50, mandor_notes: 'Pengelasan crossmember' },
    ];

    setupSupabaseMock(activeSpk, mockChecklists);

    render(
      <MemoryRouter initialEntries={['/tracking/SPK-2026-001']}>
        <Routes>
          <Route path="/tracking/:spk_no" element={<PublicProgressTracking />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('PT. Trans Logistik Indonesia')).toBeInTheDocument();
    });

    // Check normal header and "Unduh PDF" button
    expect(screen.getByText('Laporan Progres Pengerjaan Unit')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unduh PDF/i })).toBeInTheDocument();

    // Check progress section and WBS list
    expect(screen.getByText('Penyelesaian Keseluruhan')).toBeInTheDocument();
    expect(screen.getByText('Rincian Tahapan Pekerjaan')).toBeInTheDocument();
    expect(screen.getByText('Tahapan 1: Pembongkaran')).toBeInTheDocument();
    expect(screen.getByText('Tahapan 2: Sasis/Rangka')).toBeInTheDocument();

    // Thank You state should not be rendered
    expect(screen.queryByText('Unit Telah Resmi Diserahterimakan')).not.toBeInTheDocument();
  });

  it('displays grace period countdown banner when vehicle was released within 7 days', async () => {
    // Released 2 days ago
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const releasedSpk = {
      id: 'spk-2',
      spk_no: 'SPK-2026-002',
      customer_name: 'CV. Maju Lancar Cargo',
      vehicle_plate: 'N 8888 AA',
      vehicle_vin: 'MHF9988776655',
      status: 'COMPLETED',
      dp_amount: 40000000,
      released_at: twoDaysAgo,
    };

    setupSupabaseMock(releasedSpk);

    render(
      <MemoryRouter initialEntries={['/tracking/SPK-2026-002']}>
        <Routes>
          <Route path="/tracking/:spk_no" element={<PublicProgressTracking />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('CV. Maju Lancar Cargo')).toBeInTheDocument();
    });

    // Verify grace period notice is rendered
    expect(screen.getByText(/5 HARI TERSISA/i)).toBeInTheDocument();
    expect(screen.getByText(/Akses dokumentasi teknis (?:WBS|tahapan) terbuka hingga/i)).toBeInTheDocument();

    // Progress details and Unduh PDF should still be available
    expect(screen.getByRole('button', { name: /Unduh PDF/i })).toBeInTheDocument();
    expect(screen.getByText('Penyelesaian Keseluruhan')).toBeInTheDocument();
    expect(screen.queryByText('Unit Telah Resmi Diserahterimakan')).not.toBeInTheDocument();
  });

  it('switches to Thank You State and hides WBS details and "Unduh PDF" button when past 7 days of BAST', async () => {
    // Released 10 days ago (expired)
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const expiredSpk = {
      id: 'spk-3',
      spk_no: 'SPK-2026-003',
      customer_name: 'PT. Bahtera Karoseri Nusantara',
      vehicle_plate: 'L 9999 BB',
      vehicle_vin: 'VIN-BAST-EXPIRED-99',
      status: 'COMPLETED',
      dp_amount: 60000000,
      released_at: tenDaysAgo,
    };

    setupSupabaseMock(expiredSpk);

    render(
      <MemoryRouter initialEntries={['/tracking/SPK-2026-003']}>
        <Routes>
          <Route path="/tracking/:spk_no" element={<PublicProgressTracking />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Unit Telah Resmi Diserahterimakan')).toBeInTheDocument();
    });

    // Check navbar header reflects post-sales state
    expect(screen.getByText('Status Purnajual & Informasi Kendaraan')).toBeInTheDocument();

    // "Unduh PDF" button must be hidden
    expect(screen.queryByRole('button', { name: /Unduh PDF/i })).not.toBeInTheDocument();

    // Technical WBS details and overall progress must be hidden
    expect(screen.queryByText('Penyelesaian Keseluruhan')).not.toBeInTheDocument();
    expect(screen.queryByText('Rincian Tahapan Pekerjaan')).not.toBeInTheDocument();

    // Thank You Card details must be present
    expect(screen.getByText('✓')).toBeInTheDocument();
    expect(screen.getByText('SPK-2026-003')).toBeInTheDocument();
    expect(screen.getByText('L 9999 BB')).toBeInTheDocument();
    expect(screen.getByText(/Terima kasih telah mempercayakan pengerjaan modifikasi karoseri armada Anda/i)).toBeInTheDocument();
    expect(screen.getByText(/Masa pemantauan pengerjaan unit ini telah selesai dan diarsipkan demi perlindungan data operasional/i)).toBeInTheDocument();
    expect(screen.getByText('(031) 8988-2233')).toBeInTheDocument();
  });

  it('triggers Thank You State via bast_printed_at fallback when released_at is null', async () => {
    // bast_printed_at was 8 days ago
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const bastExpiredSpk = {
      id: 'spk-4',
      spk_number: 'SPK-2668',
      customer_name: 'PT. Logistik Mandiri',
      vehicle_plate: 'W 1234 CD',
      status: 'COMPLETED',
      dp_amount: 50000000,
      released_at: null,
      bast_printed_at: eightDaysAgo,
    };

    setupSupabaseMock(bastExpiredSpk);

    render(
      <MemoryRouter initialEntries={['/tracking/SPK-2668']}>
        <Routes>
          <Route path="/tracking/:spk_no" element={<PublicProgressTracking />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Unit Telah Resmi Diserahterimakan')).toBeInTheDocument();
    });

    expect(screen.getByText('SPK-2668')).toBeInTheDocument();
    expect(screen.getByText('W 1234 CD')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Unduh PDF/i })).not.toBeInTheDocument();
  });

  describe('SPK Credentials Header & Agreement Document Lightbox', () => {
    const detailedSpk = {
      id: 'spk-detailed-1',
      spk_no: 'SPK-2026-088',
      customer_name: 'PT Karoseri Cepat Jaya',
      customer_phone: '0812-3456-7890',
      vehicle_plate: 'B 9988 XYZ',
      vehicle_model: 'Mitsubishi Canter FE 74 HD',
      vehicle_vin: 'MHMFE74HD123456',
      vehicle_engine: '4D34-T98765',
      created_at: '2026-10-15T08:30:00Z',
      target_date: '2026-11-25T00:00:00Z',
      sub_tasks: ['Perpanjangan Sasis 40cm', 'Pemasangan Box Alumunium', 'Instalasi Lampu Rotary'],
      status: 'ACTIVE',
      dp_amount: 50000000,
      released_at: null,
      agreement_photos: [
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1/karoseriops/spk_agreements/SPK-2026-088_contract1.jpg',
          secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/karoseriops/spk_agreements/SPK-2026-088_contract1.jpg',
          public_id: 'karoseriops/spk_agreements/SPK-2026-088_contract1',
        },
      ],
    };

    it('renders all credentials comprehensively in the tracking header', async () => {
      setupSupabaseMock(detailedSpk);

      render(
        <MemoryRouter initialEntries={['/tracking/SPK-2026-088']}>
          <Routes>
            <Route path="/tracking/:spk_no" element={<PublicProgressTracking />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('PT Karoseri Cepat Jaya')).toBeInTheDocument();
      });

      // Verify all credentials
      expect(screen.getAllByText('SPK-2026-088')[0]).toBeInTheDocument();
      expect(screen.getByText('0812-3456-7890')).toBeInTheDocument();
      expect(screen.getByText('B 9988 XYZ')).toBeInTheDocument();
      expect(screen.getByText('Mitsubishi Canter FE 74 HD')).toBeInTheDocument();
      expect(screen.getByText('MHMFE74HD123456')).toBeInTheDocument();
      expect(screen.getByText('4D34-T98765')).toBeInTheDocument();

      // Verify sub tasks
      expect(screen.getByText('Perpanjangan Sasis 40cm')).toBeInTheDocument();
      expect(screen.getByText('Pemasangan Box Alumunium')).toBeInTheDocument();
      expect(screen.getByText('Instalasi Lampu Rotary')).toBeInTheDocument();
    });

    it('renders agreement document thumbnail (w_600 for high resolution PDF export) and opens Lightbox modal (w_1600) on click', async () => {
      setupSupabaseMock(detailedSpk);

      render(
        <MemoryRouter initialEntries={['/tracking/SPK-2026-088']}>
          <Routes>
            <Route path="/tracking/:spk_no" element={<PublicProgressTracking />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Dokumentasi Surat Kesepakatan Kerja (1 Dokumen)')).toBeInTheDocument();
      });

      // Verify thumbnail exists and uses w_600
      const thumbnailImg = screen.getByAltText('Surat Kesepakatan 1') as HTMLImageElement;
      expect(thumbnailImg).toBeInTheDocument();
      expect(getOptimizedImageUrl).toHaveBeenCalledWith(
        'https://res.cloudinary.com/demo/image/upload/v1/karoseriops/spk_agreements/SPK-2026-088_contract1.jpg',
        600
      );

      // Click thumbnail to trigger Lightbox Modal
      const thumbnailCard = screen.getByTestId('agreement-thumbnail-0');
      fireEvent.click(thumbnailCard);

      expect(screen.getByTestId('agreement-lightbox-modal')).toBeInTheDocument();
      expect(getOptimizedImageUrl).toHaveBeenCalledWith(
        'https://res.cloudinary.com/demo/image/upload/v1/karoseriops/spk_agreements/SPK-2026-088_contract1.jpg',
        1600
      );

      // Close modal
      const closeBtn = screen.getByLabelText('Tutup Pratinjau');
      fireEvent.click(closeBtn);
      expect(screen.queryByTestId('agreement-lightbox-modal')).not.toBeInTheDocument();
    });
  });

  describe('PDF Generation & Multi-Page Export via html2pdf', () => {
    beforeEach(() => {
      vi.spyOn(window, 'print').mockImplementation(() => {});
      mockHtml2PdfWorker.mockClear();
      mockSet.mockClear();
      mockFrom.mockClear();
      mockSave.mockClear();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    const activeSpkWithAssets = {
      id: 'spk-pdf-1',
      spk_no: 'SPK-2026-777',
      customer_name: 'PT Wahana Logistik Perkasa',
      customer_phone: '0811-2233-4455',
      vehicle_plate: 'L 7777 WLP',
      vehicle_model: 'Isuzu Giga FVM 240',
      vehicle_vin: 'MHFFVM24000777',
      vehicle_engine: '6HK1-778899',
      status: 'ACTIVE',
      dp_amount: 80000000,
      released_at: null,
      sub_tasks: ['Pemasangan Wingbox 9.5 Meter', 'Cat Full Oven Putih'],
      agreement_photos: [
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1/agreements/contract-777.jpg',
        },
      ],
    };

    const mockChecklists = [
      { wbs_category: 'Pembongkaran', progress_percentage: 100, mandor_notes: 'Pembongkaran bodi lama selesai.' },
      { wbs_category: 'Sasis/Rangka', progress_percentage: 100, mandor_notes: 'Pengelasan sasis selesai uji beban.' },
      { wbs_category: 'Dinding/Fabrikasi', progress_percentage: 60, mandor_notes: 'Pemasangan dinding samping.' },
      { wbs_category: 'Cat/Finishing', progress_percentage: 0, mandor_notes: '' },
      { wbs_category: 'Kelistrikan/Hidrolik', progress_percentage: 0, mandor_notes: '' },
    ];

    const mockAssets = [
      { id: 'ast-1', wbs_category: 'Pembongkaran', file_url: 'https://res.cloudinary.com/demo/image/upload/v1/wbs1_photo1.jpg', caption: 'Sasis Bersih' },
      { id: 'ast-2', wbs_category: 'Pembongkaran', file_url: 'https://res.cloudinary.com/demo/image/upload/v1/wbs1_photo2.jpg', caption: 'Crossmember Copot' },
      { id: 'ast-3', wbs_category: 'Sasis/Rangka', file_url: 'https://res.cloudinary.com/demo/image/upload/v1/wbs2_photo1.jpg', caption: 'Sambungan Las' },
    ];

    it('triggers html2pdf download with proper A4 multi-page options when Unduh PDF is clicked', async () => {
      setupSupabaseMock(activeSpkWithAssets, mockChecklists, mockAssets);

      render(
        <MemoryRouter initialEntries={['/tracking/SPK-2026-777']}>
          <Routes>
            <Route path="/tracking/:spk_no" element={<PublicProgressTracking />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('PT Wahana Logistik Perkasa')).toBeInTheDocument();
      });

      const downloadButton = screen.getByRole('button', { name: /Unduh PDF/i });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(mockHtml2PdfWorker).toHaveBeenCalled();
      });

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          margin: [10, 10, 10, 10],
          filename: 'Laporan-Progres-SPK-2026-777.pdf',
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: expect.objectContaining({
            scale: 2,
            useCORS: true,
            allowTaint: false,
            logging: false,
            letterRendering: true,
            backgroundColor: '#ffffff',
            onclone: expect.any(Function),
          }),
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: {
            mode: ['avoid-all', 'css', 'legacy'],
            avoid: ['.break-inside-avoid', 'tr', '.wbs-card'],
          },
        })
      );

      // Verify targeted element is #tracking-pdf-report
      const targetElement = mockFrom.mock.calls[0][0];
      expect(targetElement).toBeInstanceOf(HTMLElement);
      expect(targetElement.id).toBe('tracking-pdf-report');

      // Verify save was called
      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('renders all 5 WBS categories and applies crossOrigin="anonymous" on documentation photos', async () => {
      setupSupabaseMock(activeSpkWithAssets, mockChecklists, mockAssets);

      render(
        <MemoryRouter initialEntries={['/tracking/SPK-2026-777']}>
          <Routes>
            <Route path="/tracking/:spk_no" element={<PublicProgressTracking />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('PT Wahana Logistik Perkasa')).toBeInTheDocument();
      });

      // Verify Tahapan categories rendered
      expect(screen.getByText('Tahapan 1: Pembongkaran')).toBeInTheDocument();
      expect(screen.getByText('Tahapan 2: Sasis/Rangka')).toBeInTheDocument();
      expect(screen.getByText('Tahapan 3: Dinding/Fabrikasi')).toBeInTheDocument();
      expect(screen.getByText('Tahapan 4: Pengecatan')).toBeInTheDocument();
      expect(screen.getByText('Tahapan 5: Kelistrikan/Hidrolik')).toBeInTheDocument();

      // Verify Mandor Notes Box
      expect(screen.getByText('Pembongkaran bodi lama selesai.')).toBeInTheDocument();
      expect(screen.getByText('Pengelasan sasis selesai uji beban.')).toBeInTheDocument();

      // Verify photo caption and crossOrigin attribute
      expect(screen.getByText('Sasis Bersih')).toBeInTheDocument();
      const photo1 = screen.getByAltText('Sasis Bersih') as HTMLImageElement;
      expect(photo1).toHaveAttribute('crossorigin', 'anonymous');
    });

    it('falls back gracefully to window.print when html2pdf throws an error', async () => {
      mockSave.mockRejectedValueOnce(new Error('Canvas tainted or render failure'));

      setupSupabaseMock(activeSpkWithAssets, mockChecklists, mockAssets);

      render(
        <MemoryRouter initialEntries={['/tracking/SPK-2026-777']}>
          <Routes>
            <Route path="/tracking/:spk_no" element={<PublicProgressTracking />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('PT Wahana Logistik Perkasa')).toBeInTheDocument();
      });

      const downloadButton = screen.getByRole('button', { name: /Unduh PDF/i });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(window.print).toHaveBeenCalledTimes(1);
      });

      // Loading state must reset
      expect(screen.getByRole('button', { name: /Unduh PDF/i })).not.toBeDisabled();
    });
  });
});
