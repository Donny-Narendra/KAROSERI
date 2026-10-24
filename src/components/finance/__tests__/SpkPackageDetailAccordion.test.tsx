import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SpkPackageDetailAccordion } from '../SpkPackageDetailAccordion';

const mockRabItemsSpk3093 = [
  {
    id: 'it-cube-mat',
    rab_estimation_id: 'est-3093',
    spk_id: 'spk-3093',
    package_id: 'pkg-cube-1',
    package_name: 'PAKET MATERIAL EX CUBE',
    item_type: 'MATERIAL',
    material_name: 'Bahan Utama Ex Cube',
    quantity: 1,
    cost_price: 553330,
    unit_price: 553330,
    subtotal: 553330,
  },
  {
    id: 'it-cube-labor',
    rab_estimation_id: 'est-3093',
    spk_id: 'spk-3093',
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

vi.mock('../../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'rab_estimations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((_col: string, val: string) => ({
            maybeSingle: vi.fn().mockResolvedValue(
              val === 'spk-empty' ? { data: null, error: null } : { data: { id: 'est-3093' }, error: null }
            ),
          })),
        };
      }
      if (table === 'rab_items') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((_col: string, val: string) => {
            if (val === 'spk-empty' || val === 'est-empty') {
              return Promise.resolve({ data: [], error: null });
            }
            return Promise.resolve({ data: mockRabItemsSpk3093, error: null });
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
        id: 'pkg-cube-1',
        name: 'PAKET MATERIAL EX CUBE',
        selling_price: 2000000,
      },
    ]),
  },
}));

describe('SpkPackageDetailAccordion Component (SPK-3093 Verification)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders SPK-3093 assembly package with combined material + labor HPP', async () => {
    render(
      <SpkPackageDetailAccordion
        spkId="spk-3093"
        spkNumber="SPK-3093"
        customerName="PT Karoseri Indonesia"
        vehiclePlate="B 3093 KRO"
      />
    );

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText('PAKET MATERIAL EX CUBE')).toBeInTheDocument();
    });

    // Verify Selling Price: Rp 2.000.000
    expect(screen.getAllByText('Rp 2.000.000').length).toBeGreaterThanOrEqual(1);

    // Verify Material Cost: Rp 553.330
    expect(screen.getAllByText('Rp 553.330').length).toBeGreaterThanOrEqual(1);

    // Verify Labor Cost: Rp 250.000
    expect(screen.getAllByText('Rp 250.000').length).toBeGreaterThanOrEqual(1);

    // Verify Combined HPP (553.330 + 250.000 = 803.330)
    expect(screen.getAllByText('Rp 803.330').length).toBeGreaterThanOrEqual(1);

    // Verify Net Profit: 2.000.000 - 803.330 = Rp 1.196.670
    expect(screen.getAllByText('Rp 1.196.670').length).toBeGreaterThanOrEqual(1);

    // Verify Margin %: 59.8%
    expect(screen.getAllByText('59.8%').length).toBeGreaterThanOrEqual(1);
  });

  it('renders fallback notice when SPK has no packages', async () => {
    render(
      <SpkPackageDetailAccordion
        spkId="spk-empty"
        spkNumber="SPK-EMPTY"
        customerName="Budi Granular"
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Tidak ada paket assembly pada SPK SPK-EMPTY/i)
      ).toBeInTheDocument();
    });
  });
});
