import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { CorporatePnlTab } from '../CorporatePnlTab';
import { financialReportsService } from '../../../../services/financialReportsService';
import type { CorporateMonthlyPnl } from '../../../../types/financialReports';

vi.mock('../../../../services/financialReportsService', () => ({
  financialReportsService: {
    getCorporateMonthlyPnl: vi.fn(),
    getOperatingExpenseCategories: vi.fn(),
    getOperatingExpenses: vi.fn(),
    createOperatingExpense: vi.fn(),
    deleteOperatingExpense: vi.fn(),
  },
}));

describe('Component: CorporatePnlTab (Periodic OPEX, PnL Charts & Target Solver)', () => {
  const mockPnlData: CorporateMonthlyPnl[] = [
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
    vi.mocked(financialReportsService.getCorporateMonthlyPnl).mockResolvedValue(mockPnlData);
    vi.mocked(financialReportsService.getOperatingExpenseCategories).mockResolvedValue([
      { id: 'cat-1', name: 'Gaji & Upah Tetap', code: 'SALARY', default_period: 'MONTHLY' },
      { id: 'cat-2', name: 'Token Listrik & Utilitas', code: 'UTILITY_TOKEN', default_period: 'MONTHLY' },
    ]);
    vi.mocked(financialReportsService.getOperatingExpenses).mockResolvedValue([]);
  });

  it('renders corporate monthly PnL data and summary KPI cards correctly', async () => {
    render(<CorporatePnlTab />);

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText('Laporan Laba Rugi Komprehensif Perusahaan (Corporate P&L)')).toBeInTheDocument();
    });

    // Check KPI Cards
    expect(screen.getByText('8 SPK Teregistrasi')).toBeInTheDocument();
    expect(screen.getByText('Margin Kotor: 27.5%')).toBeInTheDocument();
    expect(screen.getByText('Net Margin: 16.3%')).toBeInTheDocument();
  });

  it('renders Empirical visual charts and Smart Target Solver', async () => {
    render(<CorporatePnlTab />);

    await waitFor(() => {
      expect(screen.getByText(/Tren Laba Rugi Bulanan/i)).toBeInTheDocument();
      expect(screen.getByText(/Struktur Beban Komprehensif/i)).toBeInTheDocument();
      expect(screen.getByText(/Smart Sales Target Solver/i)).toBeInTheDocument();
    });

    // Check Solver outputs (Batas Impas BEP & Target Kuantitas)
    expect(screen.getByText('Batas Impas (BEP Unit)')).toBeInTheDocument();
    expect(screen.getByText('Target Kuantitas SPK')).toBeInTheDocument();
    expect(screen.getByText('Margin Kontribusi (CM)')).toBeInTheDocument();
  });

  it('expands row details to display COGS and OPEX breakdown drawers', async () => {
    render(<CorporatePnlTab />);

    await waitFor(() => {
      expect(screen.getByText('Tabel Rekapitulasi Laba Rugi Bulanan')).toBeInTheDocument();
    });

    // Find row month expand button (e.g. "Oktober 2026")
    const expandBtn = screen.getByText(/Oktober 2026/i);
    fireEvent.click(expandBtn);

    // Verify drawer details appear
    await waitFor(() => {
      expect(screen.getByText('Rincian HPP (Cost of Goods Sold)')).toBeInTheDocument();
      expect(screen.getByText('Rincian Beban Operasional (OPEX)')).toBeInTheDocument();
      expect(screen.getByText('Bahan Baku (Material)')).toBeInTheDocument();
      expect(screen.getByText('Gaji & Staf Tetap:')).toBeInTheDocument();
    });
  });

  it('opens OPEX modal when "+ Catat Beban OPEX" button is clicked', async () => {
    render(<CorporatePnlTab />);

    await waitFor(() => {
      expect(screen.getByText('Catat Beban OPEX')).toBeInTheDocument();
    });

    const opexBtn = screen.getByText('Catat Beban OPEX');
    fireEvent.click(opexBtn);

    await waitFor(() => {
      expect(screen.getByText('Beban Operasional Berkala (OPEX)')).toBeInTheDocument();
      expect(screen.getByText('Input Beban Baru')).toBeInTheDocument();
    });
  });
});
