import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ItemizedProfitModal } from '../ItemizedProfitModal';

const mockRabItems = [
  // Package component: Material
  {
    id: 'it-1',
    item_type: 'MATERIAL',
    package_id: 'pkg-dump',
    package_name: 'Paket Dump Truck 6 Roda',
    quantity: 1,
    unit_price: 15000000,
    cost_price: 10000000,
    subtotal: 15000000,
  },
  // Package component: Labor
  {
    id: 'it-2',
    item_type: 'LABOR',
    package_id: 'pkg-dump',
    package_name: 'Paket Dump Truck 6 Roda',
    quantity: 1,
    unit_price: 5000000,
    cost_price: 2500000,
    subtotal: 5000000,
  },
  // Granular item: Material
  {
    id: 'it-3',
    item_type: 'MATERIAL',
    package_id: null,
    package_name: null,
    quantity: 2,
    unit_price: 500000,
    cost_price: 300000,
    subtotal: 1000000,
  },
  // Granular item: Labor
  {
    id: 'it-4',
    item_type: 'LABOR',
    package_id: null,
    package_name: null,
    quantity: 1,
    unit_price: 1500000,
    cost_price: 1000000,
    subtotal: 1500000,
  },
];

const mockSpk8209RabItems = [
  // Package component: Material with warehouse procurement increase (+65.000)
  {
    id: 'it-8209-1',
    item_type: 'MATERIAL',
    package_id: 'pkg-test-1',
    package_name: 'paket test 1',
    material_id: 'mat-test-1',
    quantity: 1,
    unit_price: 1000000,
    cost_price: 265000,
    materials: { id: 'mat-test-1', cost_price: 330000 },
    subtotal: 1000000,
  },
  // Package component: Labor
  {
    id: 'it-8209-2',
    item_type: 'LABOR',
    package_id: 'pkg-test-1',
    package_name: 'paket test 1',
    quantity: 1,
    unit_price: 1999998,
    cost_price: 1900000,
    subtotal: 1999998,
  },
  // Granular item: Material
  {
    id: 'it-8209-3',
    item_type: 'MATERIAL',
    package_id: null,
    package_name: null,
    quantity: 1,
    unit_price: 100000,
    cost_price: 100000,
    subtotal: 100000,
  },
];

vi.mock('../../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'rab_estimations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn((_col: string, val: string) => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: val === 'spk-8209' ? 'est-8209' : 'est-101' },
              error: null,
            }),
          })),
        };
      }
      if (table === 'rab_items') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn((_col: string, val: string) => {
            const is8209 = val === 'spk-8209' || val === 'est-8209';
            return Promise.resolve({
              data: is8209 ? mockSpk8209RabItems : mockRabItems,
              error: null,
            });
          }),
        };
      }
      if (table === 'materials') {
        return {
          select: vi.fn().mockResolvedValue({
            data: [{ id: 'mat-test-1', cost_price: 330000 }],
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
  },
}));

vi.mock('../../../services/spkService', () => ({
  spkService: {
    getChangeOrders: vi.fn(async () => []),
  },
}));

vi.mock('../../../services/packageService', () => ({
  packageService: {
    getPackages: vi.fn(async () => [
      {
        id: 'pkg-dump',
        name: 'Paket Dump Truck 6 Roda',
        selling_price: 20000000,
      },
      {
        id: 'pkg-test-1',
        name: 'paket test 1',
        selling_price: 2999998,
      },
    ]),
  },
}));

describe('ItemizedProfitModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <ItemizedProfitModal
        isOpen={false}
        onClose={vi.fn()}
        spkId="spk-101"
        spkNumber="SPK-2026-101"
        customerName="PT Tambang Sejahtera"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal header, itemized assembly package margin, and granular profit pillars', async () => {
    const onCloseMock = vi.fn();
    render(
      <ItemizedProfitModal
        isOpen={true}
        onClose={onCloseMock}
        spkId="spk-101"
        spkNumber="SPK-2026-101"
        customerName="PT Tambang Sejahtera"
        vehiclePlate="B 1234 XYZ"
      />
    );

    // Header info
    expect(screen.getByText('Model Hibrida 2 Pilar')).toBeInTheDocument();
    expect(screen.getByText('SPK-2026-101')).toBeInTheDocument();
    expect(screen.getByText(/PT Tambang Sejahtera/)).toBeInTheDocument();

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText('Paket Dump Truck 6 Roda')).toBeInTheDocument();
    });

    // Pilar 1: Package
    // Selling price: 20M, Cost: 10M (Mat) + 2.5M (Lab) = 12.5M -> Net Profit: 7.5M, Margin: 37.5%
    expect(screen.getAllByText('Rp 20.000.000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Rp 12.500.000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Rp 7.500.000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('37.5%')).toBeInTheDocument();

    // Pilar 2: Granular Material & Labor
    // Granular Material: Rev 1M, Cost 600k -> Profit 400.000 (40.0%)
    expect(screen.getByText('Rp 400.000')).toBeInTheDocument();
    expect(screen.getByText('40.0%')).toBeInTheDocument();

    // Granular Labor: Rev 1.5M, Cost 1M -> Profit 500.000 (33.3%)
    expect(screen.getByText('Rp 500.000')).toBeInTheDocument();
    expect(screen.getByText('33.3%')).toBeInTheDocument();

    // Grand Totals: Rev 22.5M, Cost 14.1M, Profit 8.4M
    expect(screen.getByText('Rp 22.500.000')).toBeInTheDocument();
    expect(screen.getByText('Rp 14.100.000')).toBeInTheDocument();
    expect(screen.getByText('Rp 8.400.000')).toBeInTheDocument();

    // Close action
    const closeBtn = screen.getByText('Tutup');
    fireEvent.click(closeBtn);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('correctly synchronizes live actual COGS, inflation badge, and Pilar 1 package metrics for SPK-8209', async () => {
    render(
      <ItemizedProfitModal
        isOpen={true}
        onClose={vi.fn()}
        spkId="spk-8209"
        spkNumber="SPK-8209"
        customerName="Bpk. Hendra"
        vehiclePlate="B 8209 ZZ"
        rowRevenue={3099998}
        rowTotalCogs={2330000}
        rowInitialCogs={2265000}
      />
    );

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText('paket test 1')).toBeInTheDocument();
    });

    // Verification Header Cards:
    // Total Pendapatan (Jual): Rp 3.099.998
    expect(screen.getByText('Rp 3.099.998')).toBeInTheDocument();
    // Total Modal HPP: Rp 2.330.000 (not Rp 2.265.000)
    expect(screen.getByText('Rp 2.330.000')).toBeInTheDocument();
    // Info badge: (Menyerap kenaikan belanja +Rp 65.000)
    expect(screen.getByText(/Menyerap kenaikan belanja \+Rp 65\.000/)).toBeInTheDocument();
    // Grand Total Laba Kotor: Rp 769.998 (not Rp 834.998)
    expect(screen.getAllByText('Rp 769.998').length).toBeGreaterThanOrEqual(2);
    // Margin Laba Bersih: 24.8% (not 26.9%)
    expect(screen.getByText('24.8%')).toBeInTheDocument();

    // Verification Pilar 1 (Paket Assembly: paket test 1):
    // Material Cost terupdate: Rp 330.000 (265.000+65.000)
    expect(screen.getByText('Rp 330.000')).toBeInTheDocument();
    // Labor Cost: Rp 1.900.000
    expect(screen.getByText('Rp 1.900.000')).toBeInTheDocument();
    // Total Modal (HPP): Rp 2.230.000 (absorbs +Rp 65.000)
    expect(screen.getAllByText('Rp 2.230.000').length).toBeGreaterThanOrEqual(1);
    // Laba Bersih Paket: Rp 769.998
    expect(screen.getAllByText('Rp 769.998').length).toBeGreaterThanOrEqual(2);
    // Package Margin: 25.7%
    expect(screen.getByText('25.7%')).toBeInTheDocument();
  });
});
