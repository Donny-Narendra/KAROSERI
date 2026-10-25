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

  it('safely falls back to zero on getExecutiveSummary when RPC returns null or empty object', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: null,
      error: null,
    } as any);

    const summary = await financialReportsService.getExecutiveSummary();
    expect(summary.total_projects).toBe(0);
    expect(summary.total_revenue).toBe(0);
    expect(summary.total_actual_material_cost).toBe(0);
    expect(summary.total_actual_labor_cost).toBe(0);
    expect(summary.total_actual_overhead_cost).toBe(0);
    expect(summary.total_cogs).toBe(0);
    expect(summary.total_gross_profit).toBe(0);
    expect(summary.average_gross_margin).toBe(0);
    expect(summary.total_inventory_valuation).toBe(0);
    expect(summary.total_inventory_market_value).toBe(0);
    expect(summary.total_outstanding_receivables).toBe(0);
    expect(summary.units_pending_handover).toBe(0);
  });

  it('safely falls back to 0 anomalies and is_healthy: true on getSanityAudit when RPC returns null', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: null,
      error: null,
    } as any);

    const audit = await financialReportsService.getSanityAudit();
    expect(audit.is_healthy).toBe(true);
    expect(audit.over_budget_count).toBe(0);
    expect(audit.over_budget_items).toEqual([]);
    expect(audit.negative_margin_count).toBe(0);
    expect(audit.negative_margin_items).toEqual([]);
    expect(audit.unbilled_completed_count).toBe(0);
    expect(audit.unbilled_completed_items).toEqual([]);
    expect(audit.critical_receivables_count).toBe(0);
    expect(audit.critical_receivables_items).toEqual([]);
  });

  it('correctly maps SPK-3093 with package component HPP (Material Rp 837.264, Labor Rp 2.100.000, Overhead Rp 128.000) and Total Omzet Rp 5.322.000', async () => {
    const mockQueryBuilder = {
      order: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      then: vi.fn(),
    };

    const rawDbRows = [
      {
        spk_id: 'spk-uuid-3093',
        spk_number: 'SPK-3093',
        customer_name: 'PT Karoseri Handal',
        vehicle_plate: 'B 3093 TXX',
        spk_status: 'ACTIVE',
        registration_date: '2026-10-25',
        total_revenue: '5322000',
        actual_material_cost: '837264',
        actual_labor_cost: '2100000',
        actual_overhead_cost: '128000',
        total_cogs: '3065264',
        gross_profit: '2256736',
        gross_margin_percentage: '42.4',
        package_revenue: '4792000',
        package_cogs: '2599664',
        package_profit: '2192336',
        granular_mat_revenue: '270000',
        granular_mat_cogs: '267600',
        granular_material_profit: '2400',
        granular_labor_revenue: '130000',
        granular_labor_cogs: '100000',
        granular_labor_profit: '30000',
        granular_foh_revenue: '130000',
        granular_foh_cogs: '98000',
        granular_overhead_profit: '32000',
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

    expect(result).toHaveLength(1);
    const item = result[0];
    expect(item.total_revenue).toBe(5_322_000);
    expect(item.actual_material_cost).toBe(837_264);
    expect(item.actual_labor_cost).toBe(2_100_000);
    expect(item.actual_overhead_cost).toBe(128_000);
    expect(item.total_cogs).toBe(3_065_264);
    expect(item.gross_profit).toBe(2_256_736);
    expect(item.gross_margin_percentage).toBe(42.4);
    expect(item.package_profit).toBe(2_192_336);
    expect(item.granular_material_profit).toBe(2_400);
    expect(item.granular_labor_profit).toBe(30_000);
    expect(item.granular_overhead_profit).toBe(32_000);
  });

  it('fetches live aggregation from view_wbs_cost_variance with zero hardcoded values', async () => {
    const mockQueryBuilder: any = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      then: vi.fn(),
    };

    const rawVarianceRows = [
      {
        spk_id: 'spk-uuid-3093',
        spk_number: 'SPK-3093',
        customer_name: 'UD. HWA HWA NGAWI',
        vehicle_plate: 'AE 4566 sfg',
        wbs_stage: 'WBS 1: Pembongkaran',
        total_material_budget: '163600',
        total_labor_budget: '80000',
        total_overhead_budget: '0',
        total_wbs_budget: '243600',
        actual_material_spent: '0',
        actual_labor_spent: '0',
        actual_overhead_spent: '0',
        total_actual_wbs_spent: '0',
        material_variance: '163600',
        labor_variance: '80000',
        overhead_variance: '0',
        total_wbs_variance: '243600',
        wbs_budget_status: 'HEMAT / DALAM BATAS',
      },
      {
        spk_id: 'spk-uuid-3093',
        spk_number: 'SPK-3093',
        customer_name: 'UD. HWA HWA NGAWI',
        vehicle_plate: 'AE 4566 sfg',
        wbs_stage: 'WBS 5: Kelistrikan/Hidrolik',
        total_material_budget: '208888',
        total_labor_budget: '1120000',
        total_overhead_budget: '128000',
        total_wbs_budget: '1456888',
        actual_material_spent: '0',
        actual_labor_spent: '0',
        actual_overhead_spent: '0',
        total_actual_wbs_spent: '0',
        material_variance: '208888',
        labor_variance: '1120000',
        overhead_variance: '128000',
        total_wbs_variance: '1456888',
        wbs_budget_status: 'HEMAT / DALAM BATAS',
      },
    ];

    mockQueryBuilder.then.mockImplementation((resolve: any) =>
      resolve({ data: rawVarianceRows, error: null })
    );

    vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as any);

    const result = await financialReportsService.getWbsCostVariance({ spkId: 'spk-uuid-3093' });

    expect(supabase.from).toHaveBeenCalledWith('view_wbs_cost_variance');
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith('spk_id', 'spk-uuid-3093');
    expect(result).toHaveLength(2);

    expect(result[0].total_material_budget).toBe(163600);
    expect(result[0].total_labor_budget).toBe(80000);
    expect(result[0].total_wbs_budget).toBe(243600);
    expect(result[0].material_variance).toBe(163600);
    expect(result[0].wbs_budget_status).toBe('HEMAT / DALAM BATAS');

    expect(result[1].total_overhead_budget).toBe(128000);
    expect(result[1].total_labor_budget).toBe(1120000);
    expect(result[1].total_wbs_budget).toBe(1456888);
  });
});

