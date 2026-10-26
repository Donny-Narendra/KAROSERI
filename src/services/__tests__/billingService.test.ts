import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchApprovedChangeOrders, fetchDPHistory, fetchDpHistory, calculateChangeOrderHppBreakdown, fetchPendingDpSpk } from '../billingService';
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
    expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('vehicle_plate'));
    expect(mockSelect).toHaveBeenCalledWith(expect.not.stringContaining('vehicle_number'));
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

  it('fetchDpHistory queries or clause with updated_at order when available', async () => {
    const mockData = [
      {
        id: 'spk-uuid-8698',
        spk_no: 'SPK-8698',
        customer_name: 'PT. Grosir Murah Kediri',
        vehicle_plate: 'AG 9988 GK',
        dp_amount: 2165000,
        status: 'ACTIVE',
        created_at: '2026-10-20T10:00:00Z',
        updated_at: '2026-10-20T10:30:00Z',
      },
    ];

    const mockOrSelect = vi.fn().mockReturnValue({
      or: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      }),
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockOrSelect,
    } as any);

    const result = await fetchDpHistory();
    expect(result).toEqual(mockData);
  });

  it('fetchDpHistory falls back to created_at order when updated_at query fails', async () => {
    const mockFallbackData = [
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

    const mockOrSelect = vi.fn().mockReturnValue({
      or: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'column updated_at does not exist', code: '42703' },
        }),
      }),
    });

    const mockFallbackSelect = vi.fn().mockReturnValue({
      gt: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockFallbackData,
            error: null,
          }),
        }),
      }),
    });

    vi.mocked(supabase.from)
      .mockReturnValueOnce({ select: mockOrSelect } as any)
      .mockReturnValueOnce({ select: mockFallbackSelect } as any);

    const result = await fetchDpHistory();
    expect(result).toEqual(mockFallbackData);
  });
});

describe('Sprint 89: calculateChangeOrderHppBreakdown Tests', () => {
  it('segregates approved change order items into MATERIAL, LABOR, and OVERHEAD costs', () => {
    const mockChangeOrders = [
      {
        id: 'co-1',
        status: 'APPROVED',
        change_order_items: [
          {
            item_name: 'Plat Besi 3mm',
            item_type: 'MATERIAL',
            quantity: 2,
            unit_price: 600000,
            cost_price: 450000,
            subtotal: 1200000,
          },
          {
            item_name: 'Jasa Las Mandor',
            item_type: 'LABOR',
            quantity: 1,
            unit_price: 500000,
            cost_price: 350000,
            subtotal: 500000,
          },
        ],
      },
      {
        id: 'co-2',
        status: 'APPROVED',
        change_order_items: [
          {
            item_name: 'Baut & Dempul',
            item_type: 'MATERIAL',
            quantity: 5,
            unit_price: 50000,
            cost_price: 30000,
            subtotal: 250000,
          },
          {
            item_name: 'Sewa Alat Genset',
            item_type: 'OVERHEAD',
            quantity: 1,
            unit_price: 300000,
            cost_price: 200000,
            subtotal: 300000,
          },
        ],
      },
      {
        id: 'co-3',
        status: 'REJECTED',
        change_order_items: [
          {
            item_name: 'Unapproved Item',
            item_type: 'MATERIAL',
            quantity: 1,
            unit_price: 1000000,
            cost_price: 800000,
            subtotal: 1000000,
          },
        ],
      },
    ];

    const result = calculateChangeOrderHppBreakdown(mockChangeOrders as any);

    // coMaterialCost: (2 * 450000) + (5 * 30000) = 900000 + 150000 = 1050000
    expect(result.coMaterialCost).toBe(1050000);
    // coLaborCost: 1 * 350000 = 350000
    expect(result.coLaborCost).toBe(350000);
    // coOverheadCost: 1 * 200000 = 200000
    expect(result.coOverheadCost).toBe(200000);
    // coTotalCost: 1050000 + 350000 + 200000 = 1600000
    expect(result.coTotalCost).toBe(1600000);
  });

  it('handles empty change orders array or null gracefully', () => {
    const result = calculateChangeOrderHppBreakdown([]);
    expect(result).toEqual({
      coMaterialCost: 0,
      coLaborCost: 0,
      coOverheadCost: 0,
      coTotalCost: 0,
    });
  });

  it('accurately reconciles SPK-3093 change order HPP scenario', () => {
    // Initial cost: 960330 (Material 710330 + Labor 250000)
    // Target Total COGS: 3065264 (Difference = 2104934)
    const mockSpk3093ChangeOrders = [
      {
        id: 'co-spk-3093',
        status: 'APPROVED',
        change_order_items: [
          { item_type: 'MATERIAL', quantity: 1, cost_price: 1354934, unit_price: 1804998 },
          { item_type: 'LABOR', quantity: 1, cost_price: 550000, unit_price: 800000 },
          { item_type: 'OVERHEAD', quantity: 1, cost_price: 200000, unit_price: 400000 },
        ],
      },
    ];

    const hpp = calculateChangeOrderHppBreakdown(mockSpk3093ChangeOrders as any);
    expect(hpp.coMaterialCost).toBe(1354934);
    expect(hpp.coLaborCost).toBe(550000);
    expect(hpp.coOverheadCost).toBe(200000);
    expect(hpp.coTotalCost).toBe(2104934);

    const initialMaterial = 710330;
    const initialLabor = 250000;
    const initialOverhead = 0;

    const actualMaterial = initialMaterial + hpp.coMaterialCost;
    const actualLabor = initialLabor + hpp.coLaborCost;
    const actualOverhead = initialOverhead + hpp.coOverheadCost;
    const totalModalHpp = actualMaterial + actualLabor + actualOverhead;

    expect(totalModalHpp).toBe(3065264);
  });
});

describe('Sprint 99: billingService.fetchPendingDpSpk Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches pending DP SPKs matching DRAFT and PENDING_PAYMENT with zero/null DP', async () => {
    const mockPendingSpks = [
      {
        id: 'spk-uuid-4417',
        spk_no: 'SPK-4417',
        customer_name: 'CUPLIZ SQUAD',
        customer_phone: '08123456789',
        vehicle_plate: 'DK 8021 XX',
        vehicle_model: 'Variasi Truk Canter',
        vehicle_vin: 'MHF4417',
        status: 'DRAFT',
        dp_amount: 0,
        total_estimated_cost: 35000000,
        target_date: '2026-11-15',
        created_at: '2026-10-26T10:00:00Z',
      },
      {
        id: 'spk-uuid-9519',
        spk_no: 'SPK-9519',
        customer_name: 'CUPLIZ SQUAD',
        customer_phone: '08123456789',
        vehicle_plate: 'DK 8021 XX',
        vehicle_model: 'Bak Truk Kayu',
        vehicle_vin: 'MHF9519',
        status: 'PENDING_PAYMENT',
        dp_amount: null,
        total_estimated_cost: 50000000,
        target_date: '2026-11-20',
        created_at: '2026-10-25T14:00:00Z',
      },
    ];

    const mockOrder = vi.fn().mockResolvedValue({
      data: mockPendingSpks,
      error: null,
    });
    const mockOr = vi.fn().mockReturnValue({ order: mockOrder });
    const mockIn = vi.fn().mockReturnValue({ or: mockOr });
    const mockSelect = vi.fn().mockReturnValue({ in: mockIn });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as any);

    const result = await fetchPendingDpSpk();

    expect(supabase.from).toHaveBeenCalledWith('spk');
    expect(mockSelect).toHaveBeenCalled();
    expect(mockIn).toHaveBeenCalledWith('status', ['DRAFT', 'PENDING_PAYMENT']);
    expect(mockOr).toHaveBeenCalledWith('dp_amount.is.null,dp_amount.eq.0');
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result).toHaveLength(2);
    expect(result[0].spk_no).toBe('SPK-4417');
    expect(result[0].status).toBe('DRAFT');
    expect(result[1].spk_no).toBe('SPK-9519');
    expect(result[1].status).toBe('PENDING_PAYMENT');
  });

  it('handles query error gracefully and returns empty array', async () => {
    const mockOrder = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Database connection error' },
    });
    const mockOr = vi.fn().mockReturnValue({ order: mockOrder });
    const mockIn = vi.fn().mockReturnValue({ or: mockOr });
    const mockSelect = vi.fn().mockReturnValue({ in: mockIn });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as any);

    const result = await fetchPendingDpSpk();
    expect(result).toEqual([]);
  });

  it('handles thrown exceptions gracefully and returns empty array', async () => {
    vi.mocked(supabase.from).mockImplementation(() => {
      throw new Error('Network crash');
    });

    const result = await fetchPendingDpSpk();
    expect(result).toEqual([]);
  });
});

