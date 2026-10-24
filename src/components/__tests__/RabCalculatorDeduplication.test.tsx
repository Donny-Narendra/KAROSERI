import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RabCalculator } from '../RabCalculator';
import { supabase } from '../../lib/supabaseClient';
import { rabService } from '../../services/rabService';

vi.mock('../../services/packageService', () => ({
  packageService: {
    getPackages: vi.fn(async () => []),
  },
}));

vi.mock('../../services/inventoryService', () => ({
  inventoryService: {
    getMaterials: vi.fn(async () => []),
  },
}));

describe('RabCalculator Deduplication Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deduplicates items on initial load preventing duplicate rows and inflated totals', async () => {
    // Mock Supabase workshop_settings
    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'workshop_settings') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { bay_hourly_rate: 25000 }, error: null }),
        } as any;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any;
    });

    // Mock rabService.loadRabItems returning duplicate items with different IDs (SPK-3093 issue)
    vi.spyOn(rabService, 'loadRabItems').mockResolvedValue({
      estimation: null,
      spk: {
        id: 'spk-3093',
        spk_no: 'SPK-3093',
        customer_name: 'PT Karoseri Prima',
        vehicle_plate: 'B 3093 TXX',
        status: 'DRAFT',
      } as any,
      items: [
        {
          id: 'item-1',
          wbsCategory: 'Sasis/Rangka',
          type: 'material',
          description: 'Pipa Kotak Hollow 40x40',
          qty: 6,
          unit: 'btg',
          unitPrice: 120000,
          costPrice: 95000,
          subtotal: 720000,
          isLocked: false,
          package_name: 'Paket Box Besi Standar',
          packageName: 'Paket Box Besi Standar',
          packageId: 'pkg-box',
          materialId: 'mat-hollow',
        },
        {
          id: 'item-2-dup', // Duplicate of item-1
          wbsCategory: 'Sasis/Rangka',
          type: 'material',
          description: 'Pipa Kotak Hollow 40x40',
          qty: 6,
          unit: 'btg',
          unitPrice: 120000,
          costPrice: 95000,
          subtotal: 720000,
          isLocked: false,
          package_name: 'Paket Box Besi Standar',
          packageName: 'Paket Box Besi Standar',
          packageId: 'pkg-box',
          materialId: 'mat-hollow',
        },
      ],
    });

    render(<RabCalculator spkId="spk-3093" />);

    // Wait until items load
    await waitFor(() => {
      expect(screen.getByText('Pipa Kotak Hollow 40x40')).toBeInTheDocument();
    });

    // Pipa Kotak Hollow 40x40 must appear only once in table
    const tableCells = screen.getAllByText('Pipa Kotak Hollow 40x40');
    expect(tableCells).toHaveLength(1);

    // Verify subtotal displays 720.000, not 1.440.000 (no doubled total)
    const amounts = screen.getAllByText(/Rp\s*720\.000/);
    expect(amounts.length).toBeGreaterThan(0);
    expect(screen.queryByText(/1\.440\.000/)).not.toBeInTheDocument();
  });
});
