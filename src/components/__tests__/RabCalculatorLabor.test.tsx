import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RabCalculator } from '../RabCalculator';

// Mock supabase client
vi.mock('../../lib/supabaseClient', () => {
  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === 'workshop_settings') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { bay_hourly_rate: 25000 }, error: null }),
          };
        }
        if (table === 'rab_estimations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'est-test-1',
                total_material_cost: 500000,
                total_labor_cost: 300000,
                total_overhead_cost: 200000,
                total_estimated_cost: 1000000,
              },
              error: null,
            }),
            upsert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'est-test-1' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'spk') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'spk-test-1',
                spk_no: 'SPK-TEST-001',
                customer_name: 'PT Karoseri Jaya',
                vehicle_plate: 'B 1234 XYZ',
                status: 'DRAFT',
                is_pricing_locked: false,
              },
              error: null,
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'rab_items') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'item-1',
                  wbs_category: 'Pembongkaran',
                  item_type: 'LABOR',
                  material_name: 'Jasa Bongkar Bodi Lama',
                  quantity: 1,
                  unit_price: 300000,
                  cost_price: 300000,
                  item_total: 300000,
                },
                {
                  id: 'item-2',
                  wbs_category: 'Sasis/Rangka',
                  item_type: 'MATERIAL',
                  material_name: 'Plat Besi 3mm',
                  quantity: 2,
                  unit_price: 250000,
                  cost_price: 200000,
                  item_total: 500000,
                },
              ],
              error: null,
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    },
  };
});

// Mock services
vi.mock('../../services/inventoryService', () => ({
  inventoryService: {
    getMaterials: vi.fn().mockResolvedValue([
      { id: 'mat-1', name: 'Plat Besi 3mm', unit_price: 250000, cost_price: 200000 },
    ]),
  },
}));

vi.mock('../../services/packageService', () => ({
  packageService: {
    getPackages: vi.fn().mockResolvedValue([]),
  },
}));

describe('Component: RabCalculator (Labor Entry & Pagu Jasa)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders RAB Calculator with 3 item type options: Bahan Baku, Jasa / Labor, and Overhead', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('RAB Calculator')).toBeInTheDocument();
    });

    expect(screen.getByText('Bahan Baku')).toBeInTheDocument();
    expect(screen.getByText('Jasa / Labor')).toBeInTheDocument();
    expect(screen.getAllByText('Overhead').length).toBeGreaterThanOrEqual(1);
  });

  it('displays distinct JASA badge for labor items and BAHAN badge for materials', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Jasa Bongkar Bodi Lama')).toBeInTheDocument();
    });

    // Check badges
    expect(screen.getByText('JASA')).toBeInTheDocument();
    expect(screen.getByText('BAHAN')).toBeInTheDocument();
  });

  it('switches input form to labor mode when Jasa / Labor radio is selected', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Bahan Baku')).toBeInTheDocument();
    });

    // Click Jasa / Labor option
    const laborLabel = screen.getByText('Jasa / Labor');
    fireEvent.click(laborLabel);

    // Verify input labels changed to Labor context
    expect(screen.getByText('Uraian Jasa / Pekerjaan Tukang')).toBeInTheDocument();
    expect(screen.getByText('Volume / Qty Jasa')).toBeInTheDocument();
    expect(screen.getByText('Tarif Upah / Jasa Borongan')).toBeInTheDocument();

    // Verify Waste Factor is NOT displayed for Labor
    expect(screen.queryByText('Waste Factor (%)')).not.toBeInTheDocument();
  });

  it('shows 3-way cost breakdown (Pagu Material, Pagu Jasa, Overhead) in footer', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Pagu Material')).toBeInTheDocument();
    });

    expect(screen.getByText('Pagu Jasa (Labor)')).toBeInTheDocument();
    expect(screen.getAllByText('Overhead').length).toBeGreaterThanOrEqual(1);

    // Verify formatted amounts
    expect(screen.getAllByText('Rp 300.000').length).toBeGreaterThanOrEqual(1); // Labor total
    expect(screen.getAllByText('Rp 500.000').length).toBeGreaterThanOrEqual(1); // Material total
  });
});
