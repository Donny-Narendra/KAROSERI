import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PublicProgressTracking } from '../PublicProgressTracking';
import { supabase } from '../../lib/supabaseClient';
import { getOptimizedImageUrl } from '../../lib/cloudinary';

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
    expect(screen.getByText('Rincian Tahapan (WBS)')).toBeInTheDocument();
    expect(screen.getByText('WBS 1: Pembongkaran')).toBeInTheDocument();
    expect(screen.getByText('WBS 2: Sasis/Rangka')).toBeInTheDocument();

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
    expect(screen.getByText(/Akses dokumentasi teknis WBS terbuka hingga/i)).toBeInTheDocument();

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
    expect(screen.queryByText('Rincian Tahapan (WBS)')).not.toBeInTheDocument();

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
      expect(screen.getByText('SPK-2026-088')).toBeInTheDocument();
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

    it('renders agreement document thumbnail (w_200) and opens Lightbox modal (w_1600) on click', async () => {
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

      // Verify thumbnail exists and uses w_200
      const thumbnailImg = screen.getByAltText('Surat Kesepakatan 1') as HTMLImageElement;
      expect(thumbnailImg).toBeInTheDocument();
      expect(getOptimizedImageUrl).toHaveBeenCalledWith(
        'https://res.cloudinary.com/demo/image/upload/v1/karoseriops/spk_agreements/SPK-2026-088_contract1.jpg',
        200
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
});
