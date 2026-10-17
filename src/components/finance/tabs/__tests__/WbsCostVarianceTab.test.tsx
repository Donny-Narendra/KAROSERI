import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { WbsCostVarianceTab } from '../WbsCostVarianceTab';
import { financialReportsService } from '../../../../services/financialReportsService';
import { supabase } from '../../../../lib/supabaseClient';
import type { WbsCostVariance } from '../../../../types/financialReports';

vi.mock('../../../../services/financialReportsService', () => ({
  financialReportsService: {
    getWbsCostVariance: vi.fn(),
  },
}));

vi.mock('../../../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Component: WbsCostVarianceTab (3-Pillar Modular Table)', () => {
  const mockVarianceData: WbsCostVariance[] = [
    {
      spk_id: 'spk-1',
      spk_number: 'SPK-2026-001',
      customer_name: 'PT Kargo Ekspres',
      vehicle_plate: 'B 1234 CD',
      wbs_stage: 'WBS 1',
      total_material_budget: 20_000_000,
      actual_material_spent: 18_000_000,
      material_variance: 2_000_000,
      total_labor_budget: 10_000_000,
      actual_labor_spent: 9_000_000,
      labor_variance: 1_000_000,
      total_overhead_budget: 3_000_000,
      actual_overhead_spent: 2_500_000,
      overhead_variance: 500_000, // Non-negative -> green
    },
    {
      spk_id: 'spk-2',
      spk_number: 'SPK-2026-002',
      customer_name: 'PT Trans Logistik',
      vehicle_plate: 'B 5678 EF',
      wbs_stage: 'WBS 2',
      total_material_budget: 15_000_000,
      actual_material_spent: 16_000_000,
      material_variance: -1_000_000,
      total_labor_budget: 8_000_000,
      actual_labor_spent: 8_000_000,
      labor_variance: 0,
      total_overhead_budget: 2_000_000,
      actual_overhead_spent: 2_800_000,
      overhead_variance: -800_000, // Negative -> red (over-budget)
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [
              { id: 'spk-1', spk_no: 'SPK-2026-001', customer_name: 'PT Kargo Ekspres', vehicle_plate: 'B 1234 CD' },
            ],
            error: null,
          }),
        }),
      }),
    } as any);

    vi.mocked(financialReportsService.getWbsCostVariance).mockResolvedValue(mockVarianceData);
  });

  it('renders modular 3-pillar headers and subheaders correctly', async () => {
    render(<WbsCostVarianceTab />);

    await waitFor(() => {
      expect(screen.getByText('Pilar Material')).toBeInTheDocument();
      expect(screen.getByText('Pilar Jasa')).toBeInTheDocument();
      expect(screen.getByText('Pilar Overhead')).toBeInTheDocument();
      expect(screen.getByText('Status Varian Total')).toBeInTheDocument();
    });

    // Sub-headers
    expect(screen.getByText('Pagu Material')).toBeInTheDocument();
    expect(screen.getByText('Realisasi Material')).toBeInTheDocument();
    expect(screen.getByText('Varian Material')).toBeInTheDocument();

    expect(screen.getByText('Pagu Jasa')).toBeInTheDocument();
    expect(screen.getByText('Realisasi Jasa')).toBeInTheDocument();
    expect(screen.getByText('Varian Jasa')).toBeInTheDocument();

    expect(screen.getByText('Pagu FOH')).toBeInTheDocument();
    expect(screen.getByText('Realisasi FOH')).toBeInTheDocument();
    expect(screen.getByText('Varian FOH')).toBeInTheDocument();
  });

  it('renders rows with formatted currency for Overhead columns', async () => {
    render(<WbsCostVarianceTab />);

    await waitFor(() => {
      // Row 1 overhead: 3M, 2.5M, 500K
      expect(screen.getAllByText(/3\.000\.000/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/2\.500\.000/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/500\.000/).length).toBeGreaterThanOrEqual(1);

      // Row 2 overhead: 2M, 2.8M, -800K
      expect(screen.getAllByText(/2\.000\.000/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/2\.800\.000/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/800\.000/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('applies red color for negative overhead variance and green for positive variance', async () => {
    render(<WbsCostVarianceTab />);

    await waitFor(() => {
      // Row 1 overhead variance (+500.000): should have text-emerald-400
      const positiveVarCells = screen.getAllByText(/500\.000/);
      expect(positiveVarCells.some(cell => cell.className.includes('text-emerald-400'))).toBe(true);

      // Row 2 overhead variance (-800.000): should have text-status-danger
      const negativeVarCells = screen.getAllByText(/800\.000/);
      expect(negativeVarCells.some(cell => cell.className.includes('text-status-danger'))).toBe(true);
    });
  });

  it('accumulates total footer for Overhead budget, actual spent, and variance', async () => {
    render(<WbsCostVarianceTab />);

    await waitFor(() => {
      expect(screen.getByText(/Total Akumulasi:/i)).toBeInTheDocument();
    });

    // Total overhead budget: 3M + 2M = 5M
    // Total overhead spent: 2.5M + 2.8M = 5.3M
    // Total overhead variance: 500K + (-800K) = -300K
    expect(screen.getAllByText(/5\.000\.000/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/5\.300\.000/).length).toBeGreaterThanOrEqual(1);
    const footerOverheadVars = screen.getAllByText(/300\.000/);
    expect(footerOverheadVars.some(cell => cell.className.includes('text-status-danger'))).toBe(true);
  });
});
