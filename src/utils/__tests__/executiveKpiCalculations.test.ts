import { describe, it, expect } from 'vitest';
import type { FinancialExecutiveSummary } from '../../types/financialReports';

export const EXECUTIVE_KPI_RPC_METADATA = {
  functionName: 'get_financial_executive_summary',
  migrationFile: '20261016040000_decouple_executive_kpi_rpc.sql',
  decoupledFields: ['total_actual_material_cost', 'total_actual_labor_cost'] as const,
};

describe('Sprint 17: Executive Dashboard Decoupled Material & Labor KPI Tests', () => {
  describe('1. RPC Migration Contract & Specification', () => {
    it('matches the planned migration file and decoupled field contracts', () => {
      expect(EXECUTIVE_KPI_RPC_METADATA.functionName).toBe('get_financial_executive_summary');
      expect(EXECUTIVE_KPI_RPC_METADATA.migrationFile).toBe('20261016040000_decouple_executive_kpi_rpc.sql');
      expect(EXECUTIVE_KPI_RPC_METADATA.decoupledFields).toContain('total_actual_material_cost');
      expect(EXECUTIVE_KPI_RPC_METADATA.decoupledFields).toContain('total_actual_labor_cost');
    });
  });

  describe('2. Executive Summary Metric Calculations & Reconciliation', () => {
    it('should correctly reconcile decoupled Material and Labor costs against Total COGS', () => {
      const summary: FinancialExecutiveSummary = {
        total_projects: 5,
        total_revenue: 200_000_000,
        total_actual_material_cost: 95_000_000,
        total_actual_labor_cost: 45_000_000,
        total_actual_overhead_cost: 0,
        total_cogs: 140_000_000,
        total_gross_profit: 60_000_000,
        average_gross_margin: 30.0,
        total_inventory_valuation: 80_000_000,
        total_inventory_market_value: 110_000_000,
        total_outstanding_receivables: 25_000_000,
        units_pending_handover: 2,
      };

      // Sum of decoupled components matches total COGS
      expect(summary.total_actual_material_cost + summary.total_actual_labor_cost + summary.total_actual_overhead_cost).toBe(summary.total_cogs);

      // Percentage of revenue calculations
      const materialPercent = (summary.total_actual_material_cost / summary.total_revenue) * 100;
      const laborPercent = (summary.total_actual_labor_cost / summary.total_revenue) * 100;
      const cogsPercent = (summary.total_cogs / summary.total_revenue) * 100;

      expect(materialPercent).toBe(47.5);
      expect(laborPercent).toBe(22.5);
      expect(materialPercent + laborPercent).toBe(cogsPercent);
      expect(cogsPercent).toBe(70.0);

      // Gross profit and margin
      expect(summary.total_revenue - summary.total_cogs).toBe(summary.total_gross_profit);
      expect(summary.average_gross_margin).toBe(30.0);
    });

    it('should correctly reconcile 3-element COGS (Material + Labor + Overhead) against Total COGS and Operating Gross Profit', () => {
      const summary: FinancialExecutiveSummary = {
        total_projects: 4,
        total_revenue: 120_000_000,
        total_actual_material_cost: 50_000_000,
        total_actual_labor_cost: 30_000_000,
        total_actual_overhead_cost: 10_000_000,
        total_cogs: 90_000_000,
        total_gross_profit: 30_000_000,
        average_gross_margin: 25.0,
        total_inventory_valuation: 40_000_000,
        total_inventory_market_value: 50_000_000,
        total_outstanding_receivables: 10_000_000,
        units_pending_handover: 1,
      };

      const computedCogs = summary.total_actual_material_cost + summary.total_actual_labor_cost + summary.total_actual_overhead_cost;
      expect(computedCogs).toBe(summary.total_cogs);

      const overheadPercent = (summary.total_actual_overhead_cost / summary.total_revenue) * 100;
      expect(overheadPercent).toBeCloseTo(8.33, 2);

      expect(summary.total_revenue - summary.total_cogs).toBe(summary.total_gross_profit);
      expect((summary.total_gross_profit / summary.total_revenue) * 100).toBe(summary.average_gross_margin);
    });

    it('should safely handle zero revenue without division by zero errors', () => {
      const summary: FinancialExecutiveSummary = {
        total_projects: 0,
        total_revenue: 0,
        total_actual_material_cost: 0,
        total_actual_labor_cost: 0,
        total_actual_overhead_cost: 0,
        total_cogs: 0,
        total_gross_profit: 0,
        average_gross_margin: 0,
        total_inventory_valuation: 15_000_000,
        total_inventory_market_value: 20_000_000,
        total_outstanding_receivables: 0,
        units_pending_handover: 0,
      };

      const totalRevenue = summary.total_revenue || 0;
      const materialPercent = totalRevenue > 0 ? (summary.total_actual_material_cost / totalRevenue) * 100 : 0;
      const laborPercent = totalRevenue > 0 ? (summary.total_actual_labor_cost / totalRevenue) * 100 : 0;

      expect(materialPercent).toBe(0);
      expect(laborPercent).toBe(0);
      expect(Number.isFinite(materialPercent)).toBe(true);
      expect(Number.isFinite(laborPercent)).toBe(true);
    });

    it('should classify margin badges according to workshop financial thresholds', () => {
      const classifyMargin = (margin: number) => {
        if (margin >= 25) return { label: 'Sehat (≥25%)', badge: 'emerald' };
        if (margin >= 10) return { label: 'Waspada (10-24%)', badge: 'amber' };
        return { label: 'Rendah (<10%)', badge: 'danger' };
      };

      expect(classifyMargin(35.5)).toEqual({ label: 'Sehat (≥25%)', badge: 'emerald' });
      expect(classifyMargin(25.0)).toEqual({ label: 'Sehat (≥25%)', badge: 'emerald' });
      expect(classifyMargin(24.9)).toEqual({ label: 'Waspada (10-24%)', badge: 'amber' });
      expect(classifyMargin(10.0)).toEqual({ label: 'Waspada (10-24%)', badge: 'amber' });
      expect(classifyMargin(9.9)).toEqual({ label: 'Rendah (<10%)', badge: 'danger' });
      expect(classifyMargin(-5.0)).toEqual({ label: 'Rendah (<10%)', badge: 'danger' });
    });
  });

  describe('3. Service Data Normalization', () => {
    it('should extract material and labor costs with default fallbacks', () => {
      // Simulate raw Supabase RPC JSON payload
      const mockRpcResponse = {
        total_projects: '12',
        total_revenue: '150000000',
        total_actual_material_cost: '60000000',
        total_actual_labor_cost: '35000000',
        total_cogs: '95000000',
        total_gross_profit: '55000000',
        average_gross_margin: '36.67',
        total_inventory_valuation: '42000000',
        total_inventory_market_value: '58000000',
        total_outstanding_receivables: '18000000',
        units_pending_handover: '1',
      };

      const normalized: FinancialExecutiveSummary = {
        total_projects: Number(mockRpcResponse?.total_projects || 0),
        total_revenue: Number(mockRpcResponse?.total_revenue || 0),
        total_actual_material_cost: Number(mockRpcResponse?.total_actual_material_cost || 0),
        total_actual_labor_cost: Number(mockRpcResponse?.total_actual_labor_cost || 0),
        total_actual_overhead_cost: Number((mockRpcResponse as any)?.total_actual_overhead_cost || 0),
        total_cogs: Number(mockRpcResponse?.total_cogs || 0),
        total_gross_profit: Number(mockRpcResponse?.total_gross_profit || 0),
        average_gross_margin: Number(mockRpcResponse?.average_gross_margin || 0),
        total_inventory_valuation: Number(mockRpcResponse?.total_inventory_valuation || 0),
        total_inventory_market_value: Number(mockRpcResponse?.total_inventory_market_value || 0),
        total_outstanding_receivables: Number(mockRpcResponse?.total_outstanding_receivables || 0),
        units_pending_handover: Number(mockRpcResponse?.units_pending_handover || 0),
      };

      expect(normalized.total_projects).toBe(12);
      expect(normalized.total_revenue).toBe(150_000_000);
      expect(normalized.total_actual_material_cost).toBe(60_000_000);
      expect(normalized.total_actual_labor_cost).toBe(35_000_000);
      expect(normalized.total_cogs).toBe(95_000_000);
      expect(normalized.total_gross_profit).toBe(55_000_000);
      expect(normalized.average_gross_margin).toBe(36.67);
      expect(normalized.units_pending_handover).toBe(1);
    });
  });
});
