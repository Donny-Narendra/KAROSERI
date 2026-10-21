import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PublicProgressTracking } from '../PublicProgressTracking';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../../lib/cloudinary', () => ({
  getOptimizedImageUrl: vi.fn((url: string) => url),
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
    expect(screen.queryByText(/Terima Kasih Telah Mempercayakan Kendaraan Anda/i)).not.toBeInTheDocument();
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
    expect(screen.queryByText(/Terima Kasih Telah Mempercayakan Kendaraan Anda/i)).not.toBeInTheDocument();
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
      expect(screen.getByText(/Terima Kasih Telah Mempercayakan Kendaraan Anda kepada RobelKaroseri/i)).toBeInTheDocument();
    });

    // Check navbar header reflects post-sales state
    expect(screen.getByText('Status Purnajual & Informasi Kendaraan')).toBeInTheDocument();

    // "Unduh PDF" button must be hidden
    expect(screen.queryByRole('button', { name: /Unduh PDF/i })).not.toBeInTheDocument();

    // Technical WBS details and overall progress must be hidden
    expect(screen.queryByText('Penyelesaian Keseluruhan')).not.toBeInTheDocument();
    expect(screen.queryByText('Rincian Tahapan (WBS)')).not.toBeInTheDocument();

    // Thank You Card details must be present
    expect(screen.getByText(/Unit Telah Selesai & Diserahterimakan \(Handover Selesai\)/i)).toBeInTheDocument();
    expect(screen.getAllByText('PT. Bahtera Karoseri Nusantara').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('SPK-2026-003').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('L 9999 BB').length).toBeGreaterThanOrEqual(2);

    // Privacy notice explaining 7-day technical WBS closure
    expect(screen.getByText(/Masa Aktif Dokumentasi Teknis Pengerjaan Telah Berakhir/i)).toBeInTheDocument();
    expect(screen.getByText(/kebijakan hak cipta dan perlindungan metode fabrikasi internal karoseri/i)).toBeInTheDocument();

    // Post-sales assurances
    expect(screen.getByText(/Jaminan Garansi Karoseri/i)).toBeInTheDocument();
    expect(screen.getByText(/Layanan Purnajual & Modifikasi/i)).toBeInTheDocument();

    // Back to home button
    expect(screen.getByRole('button', { name: /Kembali ke Beranda/i })).toBeInTheDocument();
  });
});
