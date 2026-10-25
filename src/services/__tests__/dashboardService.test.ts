import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateSpkFinancialMetrics, dashboardService } from '../dashboardService';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Service: dashboardService (Owner SPK Financial Metrics)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateSpkFinancialMetrics', () => {
    it('accurately computes base HPP, default 1.25x selling price, and zero actuals when no extras', () => {
      const spk = {
        total_estimated_cost: 100000000,
      };

      const metrics = calculateSpkFinancialMetrics(spk);

      expect(metrics.rabHpp).toBe(100000000);
      expect(metrics.coHpp).toBe(0);
      expect(metrics.totalHpp).toBe(100000000);
      expect(metrics.sellingPriceAwal).toBe(125000000); // 100m * 1.25
      expect(metrics.coRevenue).toBe(0);
      expect(metrics.totalTagihan).toBe(125000000);
      expect(metrics.totalRealisasiAktual).toBe(0);
      expect(metrics.varianceAmount).toBe(100000000);
      expect(metrics.isOverbudget).toBe(false);
    });

    it('accumulates only APPROVED Change Orders into Total HPP and Total Tagihan', () => {
      const spk = {
        total_estimated_cost: 80000000,
        total_selling_price: 110000000,
        change_orders: [
          { status: 'APPROVED', total_cost: 10000000, total_amount: 15000000 },
          { status: 'PENDING', total_cost: 5000000, total_amount: 7000000 },
          { status: 'REJECTED', total_cost: 4000000, total_amount: 6000000 },
          { status: 'APPROVED', cost_amount: 5000000, selling_price: 8000000 }, // alternative key names
        ],
      };

      const metrics = calculateSpkFinancialMetrics(spk);

      expect(metrics.rabHpp).toBe(80000000);
      // CO Approved cost: 10m + 5m = 15m
      expect(metrics.coHpp).toBe(15000000);
      expect(metrics.totalHpp).toBe(95000000);

      // Total Tagihan: 110m + 15m + 8m = 133m
      expect(metrics.sellingPriceAwal).toBe(110000000);
      expect(metrics.coRevenue).toBe(23000000);
      expect(metrics.totalTagihan).toBe(133000000);
    });

    it('calculates 3-element actual costs (material_issues + spk_borongan + spk_overhead_logs) and detects underbudget', () => {
      const spk = {
        total_estimated_cost: 50000000,
        material_issues: [
          { quantity: 10, unit_price: 1000000 }, // 10m
          { total_cost: 5000000 },               // 5m
        ],
        spk_borongan: [
          { status: 'ACTIVE', contract_value: 12000000 },
          { status: 'COMPLETED', total_amount: 3000000 },
          { status: 'CANCELLED', contract_value: 8000000 }, // Should be excluded!
          { status: 'CUT_OFF', contract_value: 6000000 },   // Should be excluded!
        ],
        spk_overhead_logs: [
          { frequency_qty: 2, rate_per_unit: 1500000 }, // 3m
          { total_amount: 2000000 },                    // 2m
        ],
      };

      const metrics = calculateSpkFinancialMetrics(spk);

      expect(metrics.materialIssuedCost).toBe(15000000);
      expect(metrics.laborActualCost).toBe(15000000); // 12m + 3m
      expect(metrics.fohActualCost).toBe(5000000);    // 3m + 2m
      expect(metrics.totalRealisasiAktual).toBe(35000000); // 15m + 15m + 5m

      expect(metrics.totalHpp).toBe(50000000);
      expect(metrics.varianceAmount).toBe(15000000); // 50m - 35m
      expect(metrics.isOverbudget).toBe(false);
    });

    it('flags overbudget when Realisasi Biaya Aktual exceeds Total HPP', () => {
      const spk = {
        total_estimated_cost: 30000000,
        material_issues: [
          { total_cost: 20000000 },
        ],
        spk_borongan: [
          { status: 'ACTIVE', contract_value: 15000000 },
        ],
        spk_overhead_logs: [
          { total_amount: 5000000 },
        ],
      };

      const metrics = calculateSpkFinancialMetrics(spk);

      // Total actual = 20m + 15m + 5m = 40m
      // Total HPP = 30m
      expect(metrics.totalHpp).toBe(30000000);
      expect(metrics.totalRealisasiAktual).toBe(40000000);
      expect(metrics.varianceAmount).toBe(-10000000); // Deficit 10m
      expect(metrics.isOverbudget).toBe(true);
      expect(metrics.variancePercentage).toBeCloseTo(33.33, 1);
    });

    it('falls back to inventory_transactions when material_issues is absent and excludes customer supplied materials', () => {
      const spk = {
        total_estimated_cost: 20000000,
        inventory_transactions: [
          { quantity_issued: 5, custom_unit_price: 1000000 }, // 5m
          { quantity_issued: 2, materials: { unit_price: 1500000 } }, // 3m
          { quantity_issued: 10, materials: { unit_price: 2000000, is_customer_supplied: true } }, // Customer supplied -> ignore!
        ],
      };

      const metrics = calculateSpkFinancialMetrics(spk);
      expect(metrics.materialIssuedCost).toBe(8000000); // 5m + 3m
      expect(metrics.totalRealisasiAktual).toBe(8000000);
      expect(metrics.isOverbudget).toBe(false);
    });

    it('correctly reconciles SPK-3093 scenario: Total Tagihan Rp 5.322.000, Total HPP Rp 3.065.264, Margin 42.4%', () => {
      const mockPackages = [
        {
          id: 'pkg-dump-3093',
          name: 'Paket Dump Truck Karoseri',
          selling_price: 2000000,
        },
      ];

      const spk3093 = {
        id: 'spk-3093',
        spk_no: 'SPK-3093',
        total_estimated_cost: 960330,
        rab_items: [
          {
            id: 'item-pkg-mat',
            package_id: 'pkg-dump-3093',
            package_name: 'Paket Dump Truck Karoseri',
            quantity: 1,
            cost_price: 553330,
            unit_price: 553330,
            subtotal: 553330,
          },
          {
            id: 'item-pkg-labor',
            package_id: 'pkg-dump-3093',
            package_name: 'Paket Dump Truck Karoseri',
            quantity: 1,
            cost_price: 250000,
            unit_price: 250000,
            subtotal: 250000,
          },
          {
            id: 'item-granular',
            package_id: null,
            package_name: null,
            quantity: 1,
            cost_price: 157000,
            unit_price: 317000,
            subtotal: 317000,
          },
        ],
        change_orders: [
          {
            id: 'co-3093-1',
            status: 'APPROVED',
            total_amount: 3004998,
            cost_adjustment: 2104934,
            change_order_items: [
              {
                id: 'co-mat-1',
                quantity: 1,
                cost_price: 1154934,
                unit_price: 1804998,
                subtotal: 1804998,
              },
              {
                id: 'co-labor-1',
                quantity: 1,
                cost_price: 950000,
                unit_price: 1200000,
                subtotal: 1200000,
              },
            ],
          },
        ],
      };

      const metrics = calculateSpkFinancialMetrics(spk3093, mockPackages);

      // Total HPP: (553330 + 250000 + 157000) + (1154934 + 950000) = 960330 + 2104934 = 3065264
      expect(metrics.rabHpp).toBe(960330);
      expect(metrics.coHpp).toBe(2104934);
      expect(metrics.totalHpp).toBe(3065264);

      // Selling Price Awal: Paket 2.000.000 + Granular 317.000 = 2.317.000
      expect(metrics.sellingPriceAwal).toBe(2317000);
      expect(metrics.coRevenue).toBe(3004998);

      // Total Tagihan: 2.317.000 + 3.004.998 = 5.321.998 -> rounded to 5.322.000
      expect(metrics.totalTagihan).toBe(5322000);

      // Projected Profit and Margin %
      const profit = metrics.totalTagihan - metrics.totalHpp;
      expect(profit).toBe(2256736);
      const marginPct = (profit / metrics.totalTagihan) * 100;
      expect(marginPct).toBeCloseTo(42.4, 1);
    });
  });

  describe('fetchOwnerDashboardSpks & fetchActiveSpkMonitoring', () => {
    it('fetches SPKs and decorates them with financial metrics and top-level fields', async () => {
      const mockSpkData = [
        {
          id: 'spk-1',
          spk_no: 'SPK-2026-001',
          customer_name: 'PT Karoseri Gemilang',
          total_estimated_cost: 50000000,
          total_selling_price: 65000000,
          status: 'ACTIVE',
          change_orders: [
            { status: 'APPROVED', total_cost: 5000000, total_amount: 8000000 },
          ],
          spk_borongan: [
            { status: 'ACTIVE', contract_value: 10000000 },
          ],
          material_issues: [
            { total_cost: 20000000 },
          ],
          spk_overhead_logs: [
            { total_amount: 2000000 },
          ],
        },
      ];

      const mockQueryBuilder: any = {
        order: vi.fn().mockResolvedValue({ data: mockSpkData, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue(mockQueryBuilder),
      } as any);

      const result = await dashboardService.fetchOwnerDashboardSpks();

      expect(result).toHaveLength(1);
      const row = result[0];
      expect(row.spk_no).toBe('SPK-2026-001');
      expect(row.total_hpp).toBe(55000000); // 50m + 5m CO
      expect(row.total_tagihan).toBe(73000000); // 65m + 8m CO
      expect(row.total_realisasi_aktual).toBe(32000000); // 20m + 10m + 2m
      expect(row.financials.varianceAmount).toBe(23000000);
      expect(row.is_overbudget).toBe(false);
    });

    it('aliases fetchActiveSpkMonitoring to fetchOwnerDashboardSpks', async () => {
      const spy = vi.spyOn(dashboardService, 'fetchOwnerDashboardSpks').mockResolvedValueOnce([] as any);
      await dashboardService.fetchActiveSpkMonitoring();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});

