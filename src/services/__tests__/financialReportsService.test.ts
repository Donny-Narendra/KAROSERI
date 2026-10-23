import { describe, it, expect, vi, beforeEach } from 'vitest';
import { financialReportsService } from '../financialReportsService';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('Service: financialReportsService (Exclude Draft SPK)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('excludes DRAFT and PENDING_PAYMENT SPKs in getJobProfitability via query filter and in-memory defense', async () => {
    const mockQueryBuilder: any = {
      order: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      then: vi.fn(),
    };

    // Simulate database returning a mixed set (e.g. edge-case or unmigrated view)
    const rawDbRows = [
      {
        spk_id: 'spk-1',
        spk_number: 'SPK-001',
        customer_name: 'PT Maju Jaya',
        spk_status: 'ACTIVE',
        registration_date: '2026-10-10',
        total_revenue: '10000000',
        actual_material_cost: '4000000',
        actual_labor_cost: '2000000',
        actual_overhead_cost: '500000',
        total_cogs: '6500000',
        gross_profit: '3500000',
        gross_margin_percentage: '35',
        payment_status: 'PAID',
      },
      {
        spk_id: 'spk-draft-8698',
        spk_number: 'SPK-8698',
        customer_name: 'PT. Grosir Murah Kediri',
        spk_status: 'DRAFT',
        registration_date: '2026-10-12',
        total_revenue: '0',
        actual_material_cost: '0',
        actual_labor_cost: '0',
        actual_overhead_cost: '0',
        total_cogs: '0',
        gross_profit: '0',
        gross_margin_percentage: '0',
        payment_status: 'UNBILLED',
      },
      {
        spk_id: 'spk-dp-9999',
        spk_number: 'SPK-9999',
        customer_name: 'Draft DP Client',
        spk_status: 'PENDING_PAYMENT',
        registration_date: '2026-10-13',
        total_revenue: '0',
        actual_material_cost: '0',
        actual_labor_cost: '0',
        actual_overhead_cost: '0',
        total_cogs: '0',
        gross_profit: '0',
        gross_margin_percentage: '0',
        payment_status: 'UNBILLED',
      },
    ];

    mockQueryBuilder.then.mockImplementation((resolve: any) =>
      resolve({ data: rawDbRows, error: null })
    );

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue(mockQueryBuilder),
    } as any);

    const result = await financialReportsService.getJobProfitability();

    // Verify .not('spk_status', 'in', '("DRAFT","PENDING_PAYMENT")') was called
    expect(mockQueryBuilder.not).toHaveBeenCalledWith('spk_status', 'in', '("DRAFT","PENDING_PAYMENT")');

    // Verify in-memory defense removed both DRAFT and PENDING_PAYMENT SPKs
    expect(result).toHaveLength(1);
    expect(result[0].spk_number).toBe('SPK-001');
    expect(result[0].spk_status).toBe('ACTIVE');
    expect(result.some(r => r.spk_number === 'SPK-8698')).toBe(false);
    expect(result.some(r => r.spk_number === 'SPK-9999')).toBe(false);
  });

  it('correctly parses and normalizes 3-pillar segregated profit fields as numbers', async () => {
    const mockQueryBuilder: any = {
      order: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      then: vi.fn(),
    };

    const rawDbRows = [
      {
        spk_id: 'spk-seg-1',
        spk_number: 'SPK-SEG-001',
        customer_name: 'PT Karoseri Sukses',
        spk_status: 'ACTIVE',
        registration_date: '2026-10-20',
        total_revenue: '100000000',
        total_cogs: '65000000',
        gross_profit: '35000000',
        gross_margin_percentage: '35',
        // Segregated raw strings from database
        package_revenue: '60000000',
        package_cogs: '40000000',
        package_profit: '20000000',
        granular_mat_revenue: '30000000',
        granular_mat_cogs: '18000000',
        granular_material_profit: '12000000',
        granular_other_revenue: '10000000',
        granular_other_cogs: '7000000',
        granular_other_profit: '3000000',
        actual_material_cost: '58000000',
        actual_labor_cost: '7000000',
        actual_overhead_cost: '0',
        payment_status: 'PAID',
      },
    ];

    mockQueryBuilder.then.mockImplementation((resolve: any) =>
      resolve({ data: rawDbRows, error: null })
    );

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue(mockQueryBuilder),
    } as any);

    const result = await financialReportsService.getJobProfitability();

    expect(result).toHaveLength(1);
    const item = result[0];
    expect(item.package_revenue).toBe(60_000_000);
    expect(item.package_cogs).toBe(40_000_000);
    expect(item.package_profit).toBe(20_000_000);
    expect(item.granular_material_revenue).toBe(30_000_000);
    expect(item.granular_material_cogs).toBe(18_000_000);
    expect(item.granular_mat_revenue).toBe(30_000_000);
    expect(item.granular_mat_cogs).toBe(18_000_000);
    expect(item.granular_material_profit).toBe(12_000_000);
    expect(item.granular_other_revenue).toBe(10_000_000);
    expect(item.granular_other_cogs).toBe(7_000_000);
    expect(item.granular_other_profit).toBe(3_000_000);
  });
});
