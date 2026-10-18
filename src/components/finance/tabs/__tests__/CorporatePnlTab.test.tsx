import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { CorporatePnlTab } from '../CorporatePnlTab';
import { operatingExpenseService } from '../../../../services/operatingExpenseService';
import type { MonthlyCorporatePnL } from '../../../../types/operatingExpenses';

vi.mock('../../../../services/operatingExpenseService', () => ({
  operatingExpenseService: {
    getCorporatePnL: vi.fn(),
    getCategories: vi.fn(),
    getExpensesByMonth: vi.fn(),
    createExpense: vi.fn(),
    deleteExpense: vi.fn(),
  },
}));

describe('Component: CorporatePnlTab (Periodic OPEX, PnL Charts & Target Solver)', () => {
  const mockPnlData: MonthlyCorporatePnL[] = [
    {
      report_month: '2026-10-01',
      total_spk_count: 8,
      total_revenue: 400_000_000,
      total_material_cogs: 180_000_000,
      total_labor_cogs: 90_000_000,
      total_foh_cogs: 20_000_000,
      total_cogs: 290_000_000,
      gross_profit: 110_000_000,
      total_opex: 45_000_000,
      net_operating_profit: 65_000_000,
      net_margin_percentage: 16.25,
      opex_salary: 25_000_000,
      opex_utility: 6_000_000,
      opex_rent: 8_000_000,
      opex_amenities: 3_000_000,
      opex_others: 3_000_000,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(operatingExpenseService.getCorporatePnL).mockResolvedValue(mockPnlData);
    vi.mocked(operatingExpenseService.getCategories).mockResolvedValue([
      { id: 'cat-1', name: 'Gaji & Upah Tetap', code: 'SALARY', default_period: 'MONTHLY' },
      { id: 'cat-2', name: 'Token Listrik & Utilitas', code: 'UTILITY_TOKEN', default_period: 'MONTHLY' },
    ]);
    vi.mocked(operatingExpenseService.getExpensesByMonth).mockResolvedValue([]);
  });

  it('renders corporate monthly PnL data and summary KPI cards correctly', async () => {
    render(<CorporatePnlTab />);

    await waitFor(() => {
      expect(screen.getByText('Laporan Laba Rugi Komprehensif Perusahaan & OPEX')).toBeInTheDocument();
    });

    // Check KPI Cards
    expect(screen.getByText('8 SPK Teregistrasi')).toBeInTheDocument();
    expect(screen.getByText('Margin: 27.5%')).toBeInTheDocument();
    expect(screen.getByText('Net Margin: 16.3%')).toBeInTheDocument();
  });

  it('renders Empirical visual charts and Smart Target Solver widget', async () => {
    render(<CorporatePnlTab />);

    await waitFor(() => {
      expect(screen.getByText(/Grafik Batang Bertumpuk & Garis Tren/i)).toBeInTheDocument();
      expect(screen.getByText(/Grafik Donut Struktur Biaya/i)).toBeInTheDocument();
      expect(screen.getByText(/Smart Sales Target Solver/i)).toBeInTheDocument();
    });

    // Check Solver outputs (Target Omzet Minimal & Kapasitas Unit Minimal)
    expect(screen.getByText('Target Omzet Minimal')).toBeInTheDocument();
    expect(screen.getByText('Kapasitas Unit Minimal')).toBeInTheDocument();
  });

  it('renders Tiered Comprehensive P&L Statement (Omzet -> HPP -> Laba Kotor -> OPEX -> EBIT)', async () => {
    render(<CorporatePnlTab />);

    await waitFor(() => {
      expect(screen.getByText(/Laporan Laba Rugi Komprehensif Berjenjang/i)).toBeInTheDocument();
    });

    expect(screen.getByText('1. Omzet / Pendapatan Penjualan SPK')).toBeInTheDocument();
    expect(screen.getByText('2. Total HPP Proyek (Cost of Goods Sold)')).toBeInTheDocument();
    expect(screen.getByText('3. Laba Kotor SPK (Gross Profit)')).toBeInTheDocument();
    expect(screen.getByText('4. Total Beban Operasional Berkala (OPEX)')).toBeInTheDocument();
    expect(screen.getByText('5. Laba Bersih Usaha Perusahaan (Net EBIT)')).toBeInTheDocument();
  });

  it('opens OPEX modal when "+ Catat Beban OPEX" button is clicked', async () => {
    render(<CorporatePnlTab />);

    await waitFor(() => {
      expect(screen.getByText('Catat Beban OPEX')).toBeInTheDocument();
    });

    const opexBtn = screen.getByText('Catat Beban OPEX');
    fireEvent.click(opexBtn);

    await waitFor(() => {
      expect(screen.getByText('Pencatatan Biaya Operasional Berkala (OPEX)')).toBeInTheDocument();
      expect(screen.getByText('Input Beban Baru')).toBeInTheDocument();
    });
  });
});
