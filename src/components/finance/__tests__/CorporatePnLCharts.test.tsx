import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CorporatePnLCharts } from '../CorporatePnLCharts';
import type { MonthlyCorporatePnL } from '../../../types/operatingExpenses';

describe('Component: CorporatePnLCharts (Reactivity & Dynamic Labels)', () => {
  const mockPnlData: MonthlyCorporatePnL[] = [
    {
      report_month: '2026-09-01',
      total_spk_count: 5,
      total_revenue: 120_000_000,
      total_material_cogs: 60_000_000,
      total_labor_cogs: 20_000_000,
      total_foh_cogs: 5_000_000,
      total_cogs: 85_000_000,
      gross_profit: 35_000_000,
      total_opex: 10_000_000,
      net_operating_profit: 25_000_000,
      net_margin_percentage: 20.83,
      opex_salary: 6_000_000,
      opex_utility: 2_000_000,
      opex_rent: 1_000_000,
      opex_amenities: 500_000,
      opex_others: 500_000,
    },
    {
      report_month: '2026-10-01',
      total_spk_count: 8,
      total_revenue: 200_000_000,
      total_material_cogs: 90_000_000,
      total_labor_cogs: 35_000_000,
      total_foh_cogs: 10_000_000,
      total_cogs: 135_000_000,
      gross_profit: 65_000_000,
      total_opex: 25_000_000,
      net_operating_profit: 40_000_000,
      net_margin_percentage: 20.0,
      opex_salary: 15_000_000,
      opex_utility: 5_000_000,
      opex_rent: 3_000_000,
      opex_amenities: 1_000_000,
      opex_others: 1_000_000,
    },
  ];

  it('renders placeholder message when data is empty', () => {
    render(<CorporatePnLCharts data={[]} />);
    expect(screen.getByText(/Belum ada data bulanan untuk grafik analisis Laba Rugi/i)).toBeInTheDocument();
  });

  it('renders chart and bottom summary labels for latest month by default with pnlData prop', () => {
    render(<CorporatePnLCharts pnlData={mockPnlData} />);

    // Check legend & title
    expect(screen.getByText('Grafik Batang Bertumpuk & Garis Tren Laba Rugi')).toBeInTheDocument();
    expect(screen.getByText('Grafik Donut Struktur Biaya (Cost Distribution)')).toBeInTheDocument();

    // Latest month is 2026-10-01
    expect(screen.getByText('Omzet Penjualan')).toBeInTheDocument();
    expect(screen.getAllByText(/200\.000\.000/).length).toBeGreaterThan(0);

    // HPP + OPEX label: 135_000_000 + 25_000_000 = 160_000_000
    expect(screen.getByText('HPP + OPEX')).toBeInTheDocument();
    expect(screen.getAllByText(/160\.000\.000/).length).toBeGreaterThan(0);

    // EBIT label: 40_000_000
    expect(screen.getByText('Laba Bersih (EBIT)')).toBeInTheDocument();
    expect(screen.getAllByText(/40\.000\.000/).length).toBeGreaterThan(0);
  });

  it('reacts immediately to updated pnlData after OPEX deletion (re-renders changed figures without hard reload)', () => {
    const { rerender } = render(<CorporatePnLCharts pnlData={mockPnlData} />);

    // Initially for 2026-10-01, OPEX was 25_000_000 so HPP+OPEX was 160_000_000 and EBIT was 40_000_000
    expect(screen.getAllByText(/160\.000\.000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/40\.000\.000/).length).toBeGreaterThan(0);

    // Simulate OPEX reduction after deleting a 5_000_000 expense
    const updatedPnlData: MonthlyCorporatePnL[] = [
      mockPnlData[0],
      {
        ...mockPnlData[1],
        total_opex: 20_000_000,
        net_operating_profit: 45_000_000, // 65_000_000 gross - 20_000_000 opex
      },
    ];

    rerender(<CorporatePnLCharts pnlData={updatedPnlData} />);

    // New HPP + OPEX: 135_000_000 + 20_000_000 = 155_000_000
    expect(screen.getAllByText(/155\.000\.000/).length).toBeGreaterThan(0);
    // New EBIT: 45_000_000
    expect(screen.getAllByText(/45\.000\.000/).length).toBeGreaterThan(0);
    // Stale 160M should be gone
    expect(screen.queryByText(/160\.000\.000/)).not.toBeInTheDocument();
  });

  it('supports data prop alias for backwards compatibility', () => {
    render(<CorporatePnLCharts data={mockPnlData} />);

    expect(screen.getAllByText(/200\.000\.000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/160\.000\.000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/40\.000\.000/).length).toBeGreaterThan(0);
  });
});
