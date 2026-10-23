import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { JobProfitabilityTab } from '../JobProfitabilityTab';
import { financialReportsService } from '../../../../services/financialReportsService';
import type { SpkJobProfitability } from '../../../../types/financialReports';

vi.mock('../../../../services/financialReportsService', () => ({
  financialReportsService: {
    getJobProfitability: vi.fn(),
  },
}));

describe('Component: JobProfitabilityTab (Operational SPKs & Draft Exclusion)', () => {
  const mockProfitabilityData: SpkJobProfitability[] = [
    {
      spk_id: 'spk-active-1',
      spk_number: 'SPK-2026-001',
      customer_name: 'PT Angkutan Prima',
      customer_phone: '08123456789',
      vehicle_plate: 'N 1111 AA',
      spk_status: 'ACTIVE',
      registration_date: '2026-10-15T08:00:00Z',
      total_revenue: 50_000_000,
      actual_material_cost: 20_000_000,
      actual_labor_cost: 10_000_000,
      actual_overhead_cost: 2_500_000,
      total_cogs: 32_500_000,
      gross_profit: 17_500_000,
      gross_margin_percentage: 35.0,
      payment_status: 'PARTIAL',
    },
    {
      spk_id: 'spk-completed-2',
      spk_number: 'SPK-2026-002',
      customer_name: 'CV Berkah Abadi',
      customer_phone: '08129876543',
      vehicle_plate: 'L 2222 BB',
      spk_status: 'COMPLETED',
      registration_date: '2026-10-16T09:30:00Z',
      total_revenue: 40_000_000,
      actual_material_cost: 15_000_000,
      actual_labor_cost: 8_000_000,
      actual_overhead_cost: 2_000_000,
      total_cogs: 25_000_000,
      gross_profit: 15_000_000,
      gross_margin_percentage: 37.5,
      payment_status: 'PAID',
    },
    {
      spk_id: 'spk-draft-8698',
      spk_number: 'SPK-8698',
      customer_name: 'PT. Grosir Murah Kediri',
      customer_phone: '081333444555',
      vehicle_plate: 'AG 8698 XY',
      spk_status: 'DRAFT',
      registration_date: '2026-10-19T10:00:00Z',
      total_revenue: 0,
      actual_material_cost: 0,
      actual_labor_cost: 0,
      actual_overhead_cost: 0,
      total_cogs: 0,
      gross_profit: 0,
      gross_margin_percentage: 0,
      payment_status: 'UNBILLED',
    },
    {
      spk_id: 'spk-pending-dp-9999',
      spk_number: 'SPK-9999',
      customer_name: 'Budi Santoso (Draft DP)',
      customer_phone: '081555666777',
      vehicle_plate: 'W 9999 ZZ',
      spk_status: 'PENDING_PAYMENT',
      registration_date: '2026-10-19T11:00:00Z',
      total_revenue: 0,
      actual_material_cost: 0,
      actual_labor_cost: 0,
      actual_overhead_cost: 0,
      total_cogs: 0,
      gross_profit: 0,
      gross_margin_percentage: 0,
      payment_status: 'UNBILLED',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(financialReportsService.getJobProfitability).mockResolvedValue(mockProfitabilityData);
  });

  it('renders table headers and displays default filter label as Semua SPK Operasional (Non-Draft)', async () => {
    render(<JobProfitabilityTab />);

    await waitFor(() => {
      expect(screen.getByText('No. SPK & Customer')).toBeInTheDocument();
      expect(screen.getByText('Pendapatan (Tagihan)')).toBeInTheDocument();
      expect(screen.getByText('Biaya Overhead (FOH)')).toBeInTheDocument();
      expect(screen.getByText('Laba Kotor (Gross)')).toBeInTheDocument();
    });

    const defaultOption = screen.getByRole('option', { name: /Semua SPK Operasional \(Non-Draft\)/i });
    expect(defaultOption).toBeInTheDocument();
    expect(defaultOption).toBeInTheDocument();
  });

  it('strictly excludes DRAFT (SPK-8698) and PENDING_PAYMENT (SPK-9999) from table rendering', async () => {
    render(<JobProfitabilityTab />);

    await waitFor(() => {
      expect(screen.getByText('SPK-2026-001')).toBeInTheDocument();
      expect(screen.getByText('SPK-2026-002')).toBeInTheDocument();
    });

    // Verify operational SPKs are present
    expect(screen.getByText(/PT Angkutan Prima/i)).toBeInTheDocument();
    expect(screen.getByText(/CV Berkah Abadi/i)).toBeInTheDocument();

    // Verify DRAFT and PENDING_PAYMENT SPKs are NOT rendered in the table
    expect(screen.queryByText('SPK-8698')).not.toBeInTheDocument();
    expect(screen.queryByText(/PT\. Grosir Murah Kediri/i)).not.toBeInTheDocument();
    expect(screen.queryByText('SPK-9999')).not.toBeInTheDocument();
    expect(screen.queryByText(/Budi Santoso \(Draft DP\)/i)).not.toBeInTheDocument();
  });

  it('calculates footer totals exclusively from operational non-draft SPKs', async () => {
    render(<JobProfitabilityTab />);

    await waitFor(() => {
      expect(screen.getByText('SPK-2026-001')).toBeInTheDocument();
    });

    // 2 operational SPKs: Total revenue = 50M + 40M = 90M (Rp 90.000.000)
    // Total material = 20M + 15M = 35M
    // Total labor = 10M + 8M = 18M
    // Total FOH = 2.5M + 2M = 4.5M
    // Total Gross Profit = 17.5M + 15M = 32.5M
    expect(screen.getByText(/Total Akumulasi \(2 SPK\):/i)).toBeInTheDocument();
  });

  it('renders 3-pillar segregated profit columns and top summary cards', async () => {
    render(<JobProfitabilityTab />);

    await waitFor(() => {
      expect(screen.getByText('Profit Paket (BOM)')).toBeInTheDocument();
      expect(screen.getByText('Profit Mat. Granular')).toBeInTheDocument();
      expect(screen.getByText('Profit Jasa & FOH')).toBeInTheDocument();
    });

    // Verify top summary cards
    expect(screen.getByText(/Profit Paket Assembly \(BOM\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Profit Material Granular/i)).toBeInTheDocument();
    expect(screen.getByText(/Profit Jasa & Overhead Lepas/i)).toBeInTheDocument();
  });
});
