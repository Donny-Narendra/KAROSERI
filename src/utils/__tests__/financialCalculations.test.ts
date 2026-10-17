import { describe, it, expect } from 'vitest';
import {
  calculateJobProfitability,
  calculateWbsBudgetVariance,
  determineHandoverClearance,
  calculateReceivableAgingDays,
  isCriticalHandoverRisk,
  formatIdrCurrency,
} from '../financialCalculations';

describe('Financial Reconciliation & Integrity Calculations', () => {
  describe('1. Job Profitability & Margin Formula (calculateJobProfitability)', () => {
    it('should correctly calculate standard positive gross profit and margin percentage', () => {
      const revenue = 50_000_000;
      const materialCost = 25_000_000;
      const laborCost = 10_000_000;

      const result = calculateJobProfitability(revenue, materialCost, laborCost);

      expect(result.totalRevenue).toBe(50_000_000);
      expect(result.materialCost).toBe(25_000_000);
      expect(result.laborCost).toBe(10_000_000);
      expect(result.totalCogs).toBe(35_000_000);
      expect(result.grossProfit).toBe(15_000_000);
      expect(result.grossMarginPercentage).toBe(30); // (15m / 50m) * 100 = 30%
      expect(result.isNegativeMargin).toBe(false);
    });

    it('should flag negative margin anomaly when total COGS exceeds revenue', () => {
      const revenue = 30_000_000;
      const materialCost = 22_000_000;
      const laborCost = 12_000_000; // total COGS = 34_000_000

      const result = calculateJobProfitability(revenue, materialCost, laborCost);

      expect(result.totalCogs).toBe(34_000_000);
      expect(result.grossProfit).toBe(-4_000_000);
      expect(result.grossMarginPercentage).toBe(-13.33); // (-4m / 30m) * 100 = -13.33%
      expect(result.isNegativeMargin).toBe(true);
    });

    it('should handle zero revenue without division by zero error', () => {
      const revenue = 0;
      const materialCost = 5_000_000;
      const laborCost = 2_000_000;

      const result = calculateJobProfitability(revenue, materialCost, laborCost);

      expect(result.totalRevenue).toBe(0);
      expect(result.totalCogs).toBe(7_000_000);
      expect(result.grossProfit).toBe(-7_000_000);
      expect(result.grossMarginPercentage).toBe(0);
      expect(result.isNegativeMargin).toBe(false); // Unbilled is not classified as negative margin project
    });

    it('should accurately calculate break-even project (0 profit, 0% margin)', () => {
      const revenue = 15_000_000;
      const materialCost = 10_000_000;
      const laborCost = 5_000_000;

      const result = calculateJobProfitability(revenue, materialCost, laborCost);

      expect(result.totalCogs).toBe(15_000_000);
      expect(result.grossProfit).toBe(0);
      expect(result.grossMarginPercentage).toBe(0);
      expect(result.isNegativeMargin).toBe(false);
    });

    it('should correctly calculate 3-element job order costing with Factory Overhead (FOH)', () => {
      const revenue = 60_000_000;
      const materialCost = 25_000_000;
      const laborCost = 15_000_000;
      const overheadCost = 5_000_000; // total COGS = 45_000_000

      const result = calculateJobProfitability(revenue, materialCost, laborCost, overheadCost);

      expect(result.totalRevenue).toBe(60_000_000);
      expect(result.materialCost).toBe(25_000_000);
      expect(result.laborCost).toBe(15_000_000);
      expect(result.overheadCost).toBe(5_000_000);
      expect(result.totalCogs).toBe(45_000_000);
      expect(result.grossProfit).toBe(15_000_000); // 60m - 45m = 15m
      expect(result.grossMarginPercentage).toBe(25); // (15m / 60m) * 100 = 25%
      expect(result.isNegativeMargin).toBe(false);
    });

    it('should flag negative margin when overhead surges total COGS beyond revenue', () => {
      const revenue = 40_000_000;
      const materialCost = 20_000_000;
      const laborCost = 15_000_000;
      const overheadCost = 10_000_000; // total COGS = 45_000_000

      const result = calculateJobProfitability(revenue, materialCost, laborCost, overheadCost);

      expect(result.totalCogs).toBe(45_000_000);
      expect(result.grossProfit).toBe(-5_000_000);
      expect(result.grossMarginPercentage).toBe(-12.5);
      expect(result.isNegativeMargin).toBe(true);
    });
  });

  describe('2. WBS Cost Variance & Change Order Adjustment (calculateWbsBudgetVariance)', () => {
    it('should correctly calculate surplus budget when actual spending is under revised budget', () => {
      const initialBudget = 10_000_000;
      const changeOrderAdjustment = 2_500_000; // revised budget = 12,500,000
      const actualSpent = 11_000_000;

      const result = calculateWbsBudgetVariance(initialBudget, changeOrderAdjustment, actualSpent);

      expect(result.totalBudget).toBe(12_500_000);
      expect(result.variance).toBe(1_500_000); // 12.5m - 11m = +1.5m surplus
      expect(result.isOverBudget).toBe(false);
      expect(result.overspendAmount).toBe(0);
    });

    it('should flag over-budget anomaly when actual spending exceeds revised budget', () => {
      const initialBudget = 10_000_000;
      const changeOrderAdjustment = 1_000_000; // revised budget = 11,000,000
      const actualSpent = 13_200_000;

      const result = calculateWbsBudgetVariance(initialBudget, changeOrderAdjustment, actualSpent);

      expect(result.totalBudget).toBe(11_000_000);
      expect(result.variance).toBe(-2_200_000); // Deficit
      expect(result.isOverBudget).toBe(true);
      expect(result.overspendAmount).toBe(2_200_000);
    });

    it('should correctly handle negative Change Orders (Scope Deductions)', () => {
      const initialBudget = 15_000_000;
      const changeOrderAdjustment = -3_000_000; // Deducted budget = 12,000,000
      const actualSpent = 12_500_000;

      const result = calculateWbsBudgetVariance(initialBudget, changeOrderAdjustment, actualSpent);

      expect(result.totalBudget).toBe(12_000_000);
      expect(result.variance).toBe(-500_000);
      expect(result.isOverBudget).toBe(true);
      expect(result.overspendAmount).toBe(500_000);
    });

    it('should handle zero actual spending (unstarted stage)', () => {
      const initialBudget = 5_000_000;
      const changeOrderAdjustment = 0;
      const actualSpent = 0;

      const result = calculateWbsBudgetVariance(initialBudget, changeOrderAdjustment, actualSpent);

      expect(result.totalBudget).toBe(5_000_000);
      expect(result.variance).toBe(5_000_000);
      expect(result.isOverBudget).toBe(false);
      expect(result.overspendAmount).toBe(0);
    });
  });

  describe('3. Handover Clearance Gate & Receivables Control (determineHandoverClearance)', () => {
    it('should grant clearance LUNAS (SIAP HANDOVER) when outstanding balance is zero', () => {
      const status = determineHandoverClearance({
        outstandingBalance: 0,
        qcStatus: 'PASS',
      });
      expect(status).toBe('LUNAS (SIAP HANDOVER)');
    });

    it('should grant clearance LUNAS (SIAP HANDOVER) when customer overpaid (negative balance)', () => {
      const status = determineHandoverClearance({
        outstandingBalance: -50_000,
        qcStatus: 'PASS',
      });
      expect(status).toBe('LUNAS (SIAP HANDOVER)');
    });

    it('should set UNIT SELESAI (TERTAHAN PELUNASAN) when QC is PASS but unpaid balance remains', () => {
      const status = determineHandoverClearance({
        outstandingBalance: 12_000_000,
        qcStatus: 'PASS',
      });
      expect(status).toBe('UNIT SELESAI (TERTAHAN PELUNASAN)');
    });

    it('should set PENGERJAAN BERJALAN when QC is not PASS and work is ongoing', () => {
      const status = determineHandoverClearance({
        outstandingBalance: 15_000_000,
        qcStatus: 'PENDING',
      });
      expect(status).toBe('PENGERJAAN BERJALAN');
    });

    it('should set PENGERJAAN BERJALAN when QC is NULL or undefined', () => {
      const status = determineHandoverClearance({
        outstandingBalance: 10_000_000,
        qcStatus: null,
      });
      expect(status).toBe('PENGERJAAN BERJALAN');
    });
  });

  describe('4. Aging Days Calculation & Critical Risk Detection', () => {
    it('should correctly calculate receivable aging days', () => {
      const invoiceDate = '2026-10-01T00:00:00.000Z';
      const referenceDate = '2026-10-16T00:00:00.000Z'; // 15 days difference

      const days = calculateReceivableAgingDays(invoiceDate, referenceDate);
      expect(days).toBe(15);
    });

    it('should flag critical handover risk when unit finished and aging > 7 days', () => {
      const isCritical = isCriticalHandoverRisk('UNIT SELESAI (TERTAHAN PELUNASAN)', 8);
      expect(isCritical).toBe(true);
    });

    it('should NOT flag critical risk if aging is within tolerance (<= 7 days)', () => {
      const isCritical = isCriticalHandoverRisk('UNIT SELESAI (TERTAHAN PELUNASAN)', 7);
      expect(isCritical).toBe(false);
    });

    it('should NOT flag critical risk if clearance is PENGERJAAN BERJALAN even if > 7 days', () => {
      const isCritical = isCriticalHandoverRisk('PENGERJAAN BERJALAN', 20);
      expect(isCritical).toBe(false);
    });
  });

  describe('5. Currency Formatting Utility (formatIdrCurrency)', () => {
    it('should format numbers with Indonesian currency symbols', () => {
      const formatted = formatIdrCurrency(1_500_000);
      // Strip non-breaking spaces before assertion
      const clean = formatted.replace(/\s+/g, ' ');
      expect(clean).toContain('Rp');
      expect(clean).toContain('1.500.000');
    });

    it('should handle zero gracefully', () => {
      const formatted = formatIdrCurrency(0);
      const clean = formatted.replace(/\s+/g, ' ');
      expect(clean).toContain('Rp');
      expect(clean).toContain('0');
    });
  });
});
