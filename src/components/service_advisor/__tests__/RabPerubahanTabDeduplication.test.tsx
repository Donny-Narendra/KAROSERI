import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RabPerubahanTab } from '../RabPerubahanTab';
import { supabase } from '../../../lib/supabaseClient';

vi.mock('../../../services/spkService', () => ({
  spkService: {
    getChangeOrders: vi.fn(async () => []),
  },
}));

vi.mock('../../../services/packageService', () => ({
  packageService: {
    getPackages: vi.fn(async () => [
      { id: 'pkg-dump', name: 'BAK DUMP PREMIUM', selling_price: 2000000 },
    ]),
  },
}));

describe('RabPerubahanTab Deduplication Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deduplicates duplicate rab_items rows and prevents doubled rows in table and totals', async () => {
    // Simulating SPK-3093 scenario: exact same material duplicated twice in DB
    const duplicatedRabRows = [
      {
        id: 'rab-item-1',
        rab_estimation_id: 'est-3093',
        spk_id: 'spk-3093',
        wbs_category: 'Sasis/Rangka',
        wbs_stage: 'WBS 2: Sasis/Rangka',
        item_type: 'MATERIAL',
        material_name: 'Plat Besi 4mm',
        description: 'Plat Besi 4mm',
        quantity: 10,
        unit: 'lembar',
        cost_price: 500000,
        unit_price: 700000,
        subtotal: 7000000,
        package_id: 'pkg-dump',
        package_name: 'BAK DUMP PREMIUM',
      },
      {
        id: 'rab-item-2-duplicate', // Duplicate row with different ID
        rab_estimation_id: 'est-3093',
        spk_id: 'spk-3093',
        wbs_category: 'Sasis/Rangka',
        wbs_stage: 'WBS 2: Sasis/Rangka',
        item_type: 'MATERIAL',
        material_name: 'Plat Besi 4mm',
        description: 'Plat Besi 4mm',
        quantity: 10,
        unit: 'lembar',
        cost_price: 500000,
        unit_price: 700000,
        subtotal: 7000000,
        package_id: 'pkg-dump',
        package_name: 'BAK DUMP PREMIUM',
      },
    ];

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'rab_estimations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn(async () => ({ data: { id: 'est-3093' }, error: null })),
        } as any;
      }
      if (table === 'rab_items') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn(async () => ({ data: duplicatedRabRows, error: null })),
        } as any;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        then: vi.fn((resolve: any) => resolve({ data: [], error: null })),
      } as any;
    });

    render(<RabPerubahanTab spkId="spk-3093" spk={{ spk_no: 'SPK-3093' }} />);

    await waitFor(() => {
      expect(screen.queryByText(/Memuat konsolidasi/i)).not.toBeInTheDocument();
    });

    // Verify Plat Besi 4mm appears in the table
    const itemCells = screen.getAllByText('Plat Besi 4mm');
    // There should only be 1 row in the table for Plat Besi 4mm
    expect(itemCells).toHaveLength(1);

    // Verify origin badges: exactly 1 RAB item badge rendered, not 2
    const rabBadges = screen.getAllByText('📋 RAB');
    expect(rabBadges).toHaveLength(1);
  });
});
