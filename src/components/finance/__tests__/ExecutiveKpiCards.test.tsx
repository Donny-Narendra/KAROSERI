import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExecutiveKpiCards } from '../ExecutiveKpiCards';
import type { FinancialExecutiveSummary } from '../../../types/financialReports';

describe('Component: ExecutiveKpiCards', () => {
  it('renders 6 loading skeleton cards when isLoading is true', () => {
    const { container } = render(<ExecutiveKpiCards summary={null} isLoading={true} />);

    const skeletonCards = container.querySelectorAll('.animate-pulse');
    expect(skeletonCards.length).toBe(6);
  });

  it('renders all 6 decoupled financial metrics correctly when summary data is provided', () => {
    const mockSummary: FinancialExecutiveSummary = {
      total_projects: 8,
      total_revenue: 100_000_000,
      total_actual_material_cost: 45_000_000,
      total_actual_labor_cost: 25_000_000,
      total_actual_overhead_cost: 5_000_000,
      total_cogs: 75_000_000,
      total_gross_profit: 30_000_000,
      average_gross_margin: 30.0,
      total_inventory_valuation: 50_000_000,
      total_inventory_market_value: 65_000_000,
      total_outstanding_receivables: 15_000_000,
      units_pending_handover: 3,
    };

    render(<ExecutiveKpiCards summary={mockSummary} isLoading={false} />);

    // Card 1: Revenue
    expect(screen.getByText(/1\. Total Omzet SPK/i)).toBeInTheDocument();
    expect(screen.getByText('8 Proyek')).toBeInTheDocument();

    // Card 2: Material Cost
    expect(screen.getByText(/2\. Biaya Bahan Baku Riil/i)).toBeInTheDocument();
    expect(screen.getByText(/\b45\.0% dari Omzet/i)).toBeInTheDocument();
    expect(screen.getByText(/Barang Keluar/i)).toBeInTheDocument();

    // Card 3: Borongan Mandor
    expect(screen.getByText(/3\. Borongan Mandor/i)).toBeInTheDocument();
    expect(screen.getByText(/\b25\.0% dari Omzet/i)).toBeInTheDocument();
    expect(screen.getByText(/Upah Terbayar/i)).toBeInTheDocument();

    // Card 4: Biaya Overhead Pabrikasi
    expect(screen.getByText(/4\. Biaya Overhead Pabrikasi/i)).toBeInTheDocument();
    expect(screen.getByText(/\b5\.0% dari Omzet/i)).toBeInTheDocument();
    expect(screen.getByText(/Pemakaian Bay & Utilitas Pabrik/i)).toBeInTheDocument();

    // Card 5: Operating Gross Profit & Margin
    expect(screen.getByText(/5\. Laba Operasional & Margin %/i)).toBeInTheDocument();
    expect(screen.getByText('30.0%')).toBeInTheDocument();
    expect(screen.getByText(/Sehat \(≥25%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/HPP:\s*Rp\s*75\.000\.000/i)).toBeInTheDocument();

    // Card 6: Receivables & Pending Units
    expect(screen.getByText(/6\. Piutang & Unit Tertahan/i)).toBeInTheDocument();
    expect(screen.getByText(/3 Unit Belum Lunas/i)).toBeInTheDocument();
  });

  it('guarantees Card 5 HPP is precise sum: Material + Labor + Overhead', () => {
    const mockSummary: FinancialExecutiveSummary = {
      total_projects: 2,
      total_revenue: 150_000_000,
      total_actual_material_cost: 60_000_000,
      total_actual_labor_cost: 30_000_000,
      total_actual_overhead_cost: 15_000_000,
      total_cogs: 0, // Even if total_cogs is 0, component sum is 105_000_000
      total_gross_profit: 45_000_000,
      average_gross_margin: 30.0,
      total_inventory_valuation: 0,
      total_inventory_market_value: 0,
      total_outstanding_receivables: 0,
      units_pending_handover: 0,
    };

    render(<ExecutiveKpiCards summary={mockSummary} isLoading={false} />);
    expect(screen.getByText(/HPP:\s*Rp\s*105\.000\.000/i)).toBeInTheDocument();
  });

  it('displays "Semua Unit Bebas Piutang" when units_pending_handover is 0', () => {
    const mockSummary: FinancialExecutiveSummary = {
      total_projects: 3,
      total_revenue: 50_000_000,
      total_actual_material_cost: 20_000_000,
      total_actual_labor_cost: 15_000_000,
      total_actual_overhead_cost: 0,
      total_cogs: 35_000_000,
      total_gross_profit: 15_000_000,
      average_gross_margin: 30.0,
      total_inventory_valuation: 10_000_000,
      total_inventory_market_value: 12_000_000,
      total_outstanding_receivables: 0,
      units_pending_handover: 0,
    };

    render(<ExecutiveKpiCards summary={mockSummary} isLoading={false} />);

    expect(screen.getByText('Semua Unit Bebas Piutang')).toBeInTheDocument();
  });

  it('correctly classifies margin thresholds: Waspada (10-24%) and Rendah (<10%)', () => {
    const summaryWaspada: FinancialExecutiveSummary = {
      total_projects: 1,
      total_revenue: 100_000_000,
      total_actual_material_cost: 60_000_000,
      total_actual_labor_cost: 22_000_000,
      total_actual_overhead_cost: 0,
      total_cogs: 82_000_000,
      total_gross_profit: 18_000_000,
      average_gross_margin: 18.0,
      total_inventory_valuation: 0,
      total_inventory_market_value: 0,
      total_outstanding_receivables: 0,
      units_pending_handover: 0,
    };

    const { rerender } = render(<ExecutiveKpiCards summary={summaryWaspada} isLoading={false} />);
    expect(screen.getByText(/Waspada \(10-24%\)/i)).toBeInTheDocument();

    const summaryRendah: FinancialExecutiveSummary = {
      ...summaryWaspada,
      total_cogs: 95_000_000,
      total_gross_profit: 5_000_000,
      average_gross_margin: 5.0,
    };

    rerender(<ExecutiveKpiCards summary={summaryRendah} isLoading={false} />);
    expect(screen.getByText(/Rendah \(<10%\)/i)).toBeInTheDocument();
  });

  it('renders gracefully with null summary fallback values without throwing', () => {
    render(<ExecutiveKpiCards summary={null} isLoading={false} />);

    expect(screen.getByText(/0 Proyek/i)).toBeInTheDocument();
    expect(screen.getByText('Semua Unit Bebas Piutang')).toBeInTheDocument();
  });
});
