import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { JobProfitabilityTab } from '../JobProfitabilityTab';
import { financialReportsService } from '../../../../services/financialReportsService';
import type { SpkJobProfitability } from '../../../../types/financialReports';

vi.mock('../../../../services/financialReportsService', () => ({
  financialReportsService: {
    getJobProfitability: vi.fn(),
  },
}));

const mockRabPackageItems = [
  {
    id: 'it-pkg-mat',
    rab_estimation_id: 'est-1',
    spk_id: 'spk-active-1',
    package_id: 'pkg-cube-1',
    package_name: 'PAKET MATERIAL EX CUBE',
    item_type: 'MATERIAL',
    material_name: 'Bahan Rakitan Dump Cube',
    quantity: 1,
    cost_price: 553330,
    unit_price: 553330,
    subtotal: 553330,
  },
  {
    id: 'it-pkg-labor',
    rab_estimation_id: 'est-1',
    spk_id: 'spk-active-1',
    package_id: 'pkg-cube-1',
    package_name: 'PAKET MATERIAL EX CUBE',
    item_type: 'LABOR',
    material_name: 'Upah Tukang Las Assembly Cube',
    quantity: 1,
    cost_price: 250000,
    unit_price: 250000,
    subtotal: 250000,
  },
];

vi.mock('../../../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'rab_estimations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'est-1' }, error: null }),
        };
      }
      if (table === 'rab_items') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: mockRabPackageItems, error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
  },
}));

vi.mock('../../../../services/spkService', () => ({
  spkService: {
    getChangeOrders: vi.fn(async () => []),
  },
}));

vi.mock('../../../../services/packageService', () => ({
  packageService: {
    getPackages: vi.fn(async () => [
      { id: 'pkg-cube-1', name: 'PAKET MATERIAL EX CUBE', selling_price: 2000000 },
    ]),
  },
}));

describe('Component: JobProfitabilityTab (Operational SPKs & 4-Pillar Segregated Margins)', () => {
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
      package_revenue: 30_000_000,
      package_cogs: 20_000_000,
      package_profit: 10_000_000,
      granular_material_revenue: 15_000_000,
      granular_material_cogs: 10_000_000,
      granular_material_profit: 5_000_000,
      granular_labor_profit: 1_500_000,
      granular_overhead_profit: 1_000_000,
      granular_other_profit: 2_500_000,
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
      package_revenue: 25_000_000,
      package_cogs: 15_000_000,
      package_profit: 10_000_000,
      granular_material_revenue: 10_000_000,
      granular_material_cogs: 7_000_000,
      granular_material_profit: 3_000_000,
      granular_labor_profit: 1_200_000,
      granular_overhead_profit: 800_000,
      granular_other_profit: 2_000_000,
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
      package_revenue: 0,
      package_cogs: 0,
      package_profit: 0,
      granular_material_revenue: 0,
      granular_material_cogs: 0,
      granular_material_profit: 0,
      granular_labor_profit: 0,
      granular_overhead_profit: 0,
      granular_other_profit: 0,
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
      package_revenue: 0,
      package_cogs: 0,
      package_profit: 0,
      granular_material_revenue: 0,
      granular_material_cogs: 0,
      granular_material_profit: 0,
      granular_labor_profit: 0,
      granular_overhead_profit: 0,
      granular_other_profit: 0,
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

    expect(screen.getByText(/Total Akumulasi \(2 SPK\):/i)).toBeInTheDocument();
  });

  it('renders 4-pillar segregated profit columns and top summary cards', async () => {
    render(<JobProfitabilityTab />);

    await waitFor(() => {
      expect(screen.getAllByText('Laba Paket Assembly').length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('Laba Material Lepas').length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('Laba Labor Mandor').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('Laba FOH')).toBeInTheDocument();
    });

    // Verify top summary cards
    expect(screen.getByText(/Laba FOH \(Overhead\)/i)).toBeInTheDocument();
  });

  it('toggles drawer/accordion detail row to display package assembly list with combined material and labor HPP', async () => {
    render(<JobProfitabilityTab />);

    await waitFor(() => {
      expect(screen.getByText('SPK-2026-001')).toBeInTheDocument();
    });

    const expandBtn = screen.getByTestId('btn-expand-spk-active-1');
    expect(expandBtn).toBeInTheDocument();
    fireEvent.click(expandBtn);

    // Verify package drawer/accordion opens with package items and combined HPP
    await waitFor(() => {
      expect(screen.getByText(/Daftar Paket Assembly & HPP Gabungan/i)).toBeInTheDocument();
      expect(screen.getByText('PAKET MATERIAL EX CUBE')).toBeInTheDocument();
      // Selling price: Rp 2.000.000
      expect(screen.getAllByText(/2\.000\.000/).length).toBeGreaterThanOrEqual(1);
      // Combined HPP (553.330 + 250.000 = 803.330)
      expect(screen.getAllByText(/803\.330/).length).toBeGreaterThanOrEqual(1);
      // Net profit: Rp 1.196.670
      expect(screen.getAllByText(/1\.196\.670/).length).toBeGreaterThanOrEqual(1);
    });

    // Toggle close
    fireEvent.click(expandBtn);
    await waitFor(() => {
      expect(screen.queryByText(/Daftar Paket Assembly & HPP Gabungan/i)).not.toBeInTheDocument();
    });
  });

  it('opens ItemizedProfitModal drill-down when clicking Rincian Laba button and allows closing it', async () => {
    render(<JobProfitabilityTab />);

    await waitFor(() => {
      expect(screen.getByText('SPK-2026-001')).toBeInTheDocument();
    });

    const breakdownBtn = screen.getByTestId('btn-breakdown-spk-active-1');
    expect(breakdownBtn).toBeInTheDocument();
    fireEvent.click(breakdownBtn);

    // Verify modal is displayed
    await waitFor(() => {
      expect(screen.getByText('Rincian Laba Paket Barang Jadi vs Penjualan Lepas')).toBeInTheDocument();
      expect(screen.getByText('Model Hibrida 2 Pilar')).toBeInTheDocument();
      expect(screen.getByText('PILAR 1')).toBeInTheDocument();
      expect(screen.getByText('PILAR 2')).toBeInTheDocument();
    });

    // Close modal
    const closeBtn = screen.getByText('Tutup');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText('Rincian Laba Paket Barang Jadi vs Penjualan Lepas')).not.toBeInTheDocument();
    });
  });
});
