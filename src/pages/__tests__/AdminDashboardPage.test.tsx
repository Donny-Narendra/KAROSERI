import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AdminDashboardPage } from '../AdminDashboardPage';
import { dashboardService } from '../../services/dashboardService';

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'user-owner-id', full_name: 'Owner Robel', role: 'owner' },
    signOut: vi.fn(),
  }),
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
    i18n: { language: 'id', changeLanguage: vi.fn() },
  }),
}));

describe('Page: AdminDashboardPage (Consolidated WIP & Costing Verification)', () => {
  it('correctly renders TOTAL NILAI WIP (Rp 5.322.000), Projected Cost (Rp 3.065.264), and Margin (+42.4%) for SPK-3093', async () => {
    const mockSpk3093 = {
      id: 'd9c2a81d-a9b6-41e9-8623-fc69c0d86ffe',
      spk_no: 'SPK-3093',
      customer_name: 'UD. HWA HWA NGAWI',
      vehicle_plate: 'B 3093 TXX',
      status: 'ACTIVE',
      qc_status: 'IN_PROGRESS',
      dp_amount: 1500000,
      payment_status: 'UNPAID',
      created_at: '2026-10-24T00:00:00Z',
      total_hpp: 3065264,
      total_tagihan: 5322000,
      total_realisasi_aktual: 0,
      financials: {
        rabHpp: 960330,
        coHpp: 2104934,
        totalHpp: 3065264,
        sellingPriceAwal: 2317000,
        coRevenue: 3004998,
        totalTagihan: 5322000,
        materialIssuedCost: 0,
        laborActualCost: 0,
        fohActualCost: 0,
        totalRealisasiAktual: 0,
        varianceAmount: 3065264,
        variancePercentage: 0,
        isOverbudget: false,
      },
      rab_estimations: [
        { total_estimated_cost: 960330 }
      ],
      rab_items: [],
      change_orders: [
        { status: 'APPROVED', total_amount: 3004998, cost_adjustment: 2104934 }
      ],
      spk_amendments: [],
      inventory_transactions: [],
      material_issues: [],
      spk_borongan: [],
      spk_overhead_logs: [],
    };

    vi.spyOn(dashboardService, 'fetchOwnerDashboardSpks').mockResolvedValue([mockSpk3093 as any]);

    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('SPK-3093')).toBeInTheDocument();
    });

    const wipMatches = screen.getAllByText(/5\.322\.000/);
    expect(wipMatches.length).toBeGreaterThanOrEqual(1);

    // 2. Verify Actual Costing vs Projected Margin card
    // Projected Cost: Rp 3.065.264
    expect(screen.getByText(/\/.*Rp\s*3\.065\.264/)).toBeInTheDocument();
    // Margin: +42.4%
    expect(screen.getByText(/\+42\.4%/)).toBeInTheDocument();

    // 3. Verify Pemantauan SPK Aktif Table
    expect(screen.getByText('SPK-3093')).toBeInTheDocument();
    expect(screen.getByText('UD. HWA HWA NGAWI')).toBeInTheDocument();
    // TOTAL HPP in row
    expect(screen.getAllByText(/Rp\s*3\.065\.264/).length).toBeGreaterThanOrEqual(1);
    // TOTAL TAGIHAN in row
    expect(screen.getAllByText(/Rp\s*5\.322\.000/).length).toBeGreaterThanOrEqual(1);
  });

  it('correctly renders revised actual HPP (Rp 2.330.000) and informative badge "(Revisi Belanja +Rp 65.000)" for SPK-8209', async () => {
    const mockSpk8209 = {
      id: 'spk-uuid-8209',
      spk_no: 'SPK-8209',
      customer_name: 'PT Mitra Logistik 8209',
      vehicle_plate: 'L 8209 AA',
      status: 'ACTIVE',
      qc_status: 'IN_PROGRESS',
      dp_amount: 500000,
      payment_status: 'UNPAID',
      created_at: '2026-11-04T00:00:00Z',
      initial_cogs: 2265000,
      total_cogs: 2330000,
      total_hpp: 2330000,
      total_tagihan: 3099998,
      total_realisasi_aktual: 2330000,
      financials: {
        rabHpp: 2265000,
        coHpp: 0,
        totalHpp: 2330000,
        sellingPriceAwal: 3099998,
        coRevenue: 0,
        totalTagihan: 3099998,
        materialIssuedCost: 1080000,
        laborActualCost: 1000000,
        fohActualCost: 250000,
        totalRealisasiAktual: 2330000,
        varianceAmount: 0,
        variancePercentage: 0,
        isOverbudget: false,
      },
      rab_estimations: [
        { total_estimated_cost: 2265000 }
      ],
      rab_items: [],
      change_orders: [],
      spk_amendments: [],
      inventory_transactions: [],
      material_issues: [],
      spk_borongan: [],
      spk_overhead_logs: [],
    };

    vi.spyOn(dashboardService, 'fetchOwnerDashboardSpks').mockResolvedValue([mockSpk8209 as any]);

    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('SPK-8209')).toBeInTheDocument();
    });

    // Verify Active SPK Monitoring row for SPK-8209
    expect(screen.getByText('PT Mitra Logistik 8209')).toBeInTheDocument();
    expect(screen.getByText('L 8209 AA')).toBeInTheDocument();

    // TOTAL HPP displays Rp 2.330.000 (actual COGS), not initial 2.265.000
    expect(screen.getAllByText(/Rp\s*2\.330\.000/).length).toBeGreaterThanOrEqual(1);

    // Informative badge displayed for price increase
    expect(screen.getByText(/\(Revisi Belanja \+Rp\s*65\.000\)/)).toBeInTheDocument();
  });

  it('renders toggle button for test/archived SPK and triggers fetchOwnerDashboardSpks with options', async () => {
    const fetchSpy = vi.spyOn(dashboardService, 'fetchOwnerDashboardSpks').mockResolvedValue([]);

    const { fireEvent } = await import('@testing-library/react');
    render(<AdminDashboardPage />);

    expect(fetchSpy).toHaveBeenCalledWith({ showHidden: false });

    const toggleBtn = screen.getByRole('button', { name: /Tampilkan SPK Uji Coba \/ Arsip/i });
    expect(toggleBtn).toBeInTheDocument();

    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith({ showHidden: true });
    });
  });

  it('renders "Kelola Isolasi SPK" for Owner and displays TERISOLASI badge for hidden/test SPK', async () => {
    const mockIsolatedSpk = {
      id: 'spk-iso-1',
      spk_no: 'SPK-TEST-99',
      customer_name: 'Simulasi Customer',
      vehicle_plate: 'TEST 123',
      status: 'ACTIVE',
      is_hidden: true,
      is_test: true,
      total_hpp: 1000000,
      total_tagihan: 2000000,
      financials: { totalHpp: 1000000, totalTagihan: 2000000 },
    };

    vi.spyOn(dashboardService, 'fetchOwnerDashboardSpks').mockResolvedValue([mockIsolatedSpk as any]);

    const { fireEvent } = await import('@testing-library/react');
    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('SPK-TEST-99')).toBeInTheDocument();
    });

    expect(screen.getByText('TERISOLASI')).toBeInTheDocument();

    // Owner isolation management button
    const manageBtns = screen.getAllByRole('button', { name: /Kelola Isolasi SPK|Isolasi SPK Uji Coba/i });
    expect(manageBtns.length).toBeGreaterThan(0);

    fireEvent.click(manageBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Manajemen Isolasi SPK \(Soft-Isolation\)/i)).toBeInTheDocument();
    });
  });
});
