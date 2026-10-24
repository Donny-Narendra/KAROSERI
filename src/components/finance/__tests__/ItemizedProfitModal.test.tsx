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

vi.mock('../../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'rab_estimations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'est-101' }, error: null }),
        };
      }
      if (table === 'rab_items') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: mockRabItems, error: null }),
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
});
