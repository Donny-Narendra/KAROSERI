import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchApprovedChangeOrders, fetchDPHistory } from '../billingService';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Sprint 49: billingService.fetchApprovedChangeOrders Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when spkId is empty or null', async () => {
    const result = await fetchApprovedChangeOrders('');
    expect(result).toEqual([]);
  });

  it('successfully fetches and maps approved change orders with nested items', async () => {
    const mockDbData = [
      {
        id: 'co-123',
        co_number: 'CO-SPK2668-01',
        description: 'Upgrade Plat Dinding & Lampu Interior',
        total_amount: 3200000,
        cost_adjustment: 3200000,
        status: 'APPROVED',
        created_at: '2026-10-18T10:00:00Z',
        approved_at: '2026-10-19T09:00:00Z',
        approved_by: 'supervisor-1',
        change_order_items: [
          {
            id: 'item-1',
            item_name: 'Plat Besi Galvanis 3mm',
            item_type: 'MATERIAL',
            wbs_stage: 'WBS 3: Dinding/Fabrikasi',
            quantity: 4,
            unit: 'lembar',
            unit_price: 500000,
            cost_price: 350000,
            subtotal: 2000000,
            notes: 'Spesifikasi tahan karat',
          },
          {
            id: 'item-2',
            item_name: 'Jasa Pemasangan & Finishing Las',
            item_type: 'LABOR',
            wbs_stage: 'WBS 3: Dinding/Fabrikasi',
            quantity: 1,
            unit: 'paket',
            unit_price: 1200000,
            cost_price: 800000,
            subtotal: 1200000,
          },
        ],
      },
    ];

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockDbData,
            error: null,
          }),
        }),
      }),
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as any);

    const result = await fetchApprovedChangeOrders('spk-db-uuid-1');

    expect(supabase.from).toHaveBeenCalledWith('change_orders');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('co-123');
    expect(result[0].order_number).toBe('CO-SPK2668-01');
    expect(result[0].co_number).toBe('CO-SPK2668-01');
    expect(result[0].description).toBe('Upgrade Plat Dinding & Lampu Interior');
    expect(result[0].wbs_stage).toBe('WBS 3: Dinding/Fabrikasi');
    expect(result[0].total_amount).toBe(3200000);
    expect(result[0].change_order_items).toHaveLength(2);
    expect(result[0].change_order_items[0].item_name).toBe('Plat Besi Galvanis 3mm');
    expect(result[0].change_order_items[0].subtotal).toBe(2000000);
    expect(result[0].change_order_items[1].item_type).toBe('LABOR');
  });

  it('falls back to legacy spk_amendments if change_orders is empty', async () => {
    // 1st call for change_orders returns empty
    const mockCoSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    });

    // 2nd call for legacy spk_amendments returns legacy amendment
    const mockLegacySelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'amend-legacy-1',
                spk_id: 'spk-uuid-1',
                description: 'Penambahan Kanopi Belakang',
                cost_adjustment: 1500000,
                status: 'APPROVED',
                approved_by: 'owner-1',
                created_at: '2026-10-17T09:00:00Z',
              },
            ],
            error: null,
          }),
        }),
      }),
    });

    vi.mocked(supabase.from)
      .mockReturnValueOnce({ select: mockCoSelect } as any)
      .mockReturnValueOnce({ select: mockLegacySelect } as any);

    const result = await fetchApprovedChangeOrders('spk-uuid-1');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('amend-legacy-1');
    expect(result[0].description).toBe('Penambahan Kanopi Belakang');
    expect(result[0].total_amount).toBe(1500000);
    expect(result[0].order_number).toBe('CO-LEGACY-AMEND-');
    expect(result[0].change_order_items).toHaveLength(1);
    expect(result[0].change_order_items[0].subtotal).toBe(1500000);
  });

  it('fetches DP history correctly via fetchDPHistory', async () => {
    const mockDpData = [
      {
        id: 'spk-1',
        spk_no: 'SPK-2668',
        customer_name: 'PT Wara Wiri',
        vehicle_plate: 'B 1234 WWR',
        dp_amount: 10000000,
        status: 'ACTIVE',
        payments: [
          {
            amount: 10000000,
            payment_method: 'Transfer BCA',
            notes: 'DP 20%',
            created_at: '2026-10-18T10:00:00Z',
          },
        ],
      },
    ];

    const mockSelect = vi.fn().mockReturnValue({
      gt: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: mockDpData,
          error: null,
        }),
      }),
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as any);

    const result = await fetchDPHistory();

    expect(supabase.from).toHaveBeenCalledWith('spk');
    expect(result).toHaveLength(1);
    expect(result[0].spk_no).toBe('SPK-2668');
    expect(result[0].dp_amount).toBe(10000000);
    expect(result[0].payment_method).toBe('Transfer BCA');
  });

  it('gracefully falls back to direct spk query when payments relation join fails', async () => {
    const mockFallbackSpkData = [
      {
        id: 'spk-uuid-8698',
        spk_no: 'SPK-8698',
        customer_name: 'PT. Grosir Murah Kediri',
        vehicle_plate: 'AG 9988 GK',
        dp_amount: 2165000,
        status: 'ACTIVE',
        created_at: '2026-10-20T10:00:00Z',
      },
    ];

    // 1st call (with payments join) fails with an error (e.g., relation not found or RLS error)
    const mockJoinSelect = vi.fn().mockReturnValue({
      gt: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('relation public.payments does not exist'),
        }),
      }),
    });

    // 2nd call (fallback to spk direct) succeeds
    const mockFallbackSelect = vi.fn().mockReturnValue({
      gt: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: mockFallbackSpkData,
          error: null,
        }),
      }),
    });

    vi.mocked(supabase.from)
      .mockReturnValueOnce({ select: mockJoinSelect } as any)
      .mockReturnValueOnce({ select: mockFallbackSelect } as any);

    const result = await fetchDPHistory();

    expect(result).toHaveLength(1);
    expect(result[0].spk_no).toBe('SPK-8698');
    expect(result[0].dp_amount).toBe(2165000);
    expect(result[0].customer_name).toBe('PT. Grosir Murah Kediri');
    expect(result[0].payment_method).toBe('Transfer Bank');
    expect(result[0].notes).toBe('Pembayaran Uang Muka (DP)');
  });

  it('supports down_payment_amount field and falls back to spk.id when spk_no is missing', async () => {
    const mockFallbackData = [
      {
        id: 'SPK-8698-FALLBACK',
        customer_name: 'Toko Sumber Rejeki',
        vehicle_plate: 'N 8899 TR',
        down_payment_amount: 3500000,
        status: 'ACTIVE',
        created_at: '2026-10-20T11:00:00Z',
      },
    ];

    const mockSelect = vi.fn().mockReturnValue({
      gt: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: mockFallbackData,
          error: null,
        }),
      }),
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as any);

    const result = await fetchDPHistory();

    expect(result).toHaveLength(1);
    expect(result[0].spk_no).toBe('SPK-8698-FALLBACK');
    expect(result[0].dp_amount).toBe(3500000);
    expect(result[0].customer_name).toBe('Toko Sumber Rejeki');
  });
});
