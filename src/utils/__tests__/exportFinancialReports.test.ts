import { describe, it, expect } from 'vitest';
import {
  getFormattedDateForFilename,
  formatLocalTimestamp,
  mapProfitabilityToExcelRows,
  mapVarianceToExcelRows,
  mapInventoryToExcelRows,
  mapReceivablesToExcelRows,
} from '../exportFinancialReports';
import type {
  SpkJobProfitability,
  WbsCostVariance,
  InventoryValuation,
  ProjectReceivable,
} from '../../types/financialReports';

describe('Financial Report Export Engine & Mapping (exportFinancialReports)', () => {
  describe('1. Filename & Date Formatting Helpers', () => {
    it('should format dates as YYYYMMDD for filenames', () => {
      const fixedDate = new Date(2026, 9, 16); // October 16, 2026
      const result = getFormattedDateForFilename(fixedDate);
      expect(result).toBe('20261016');
    });

    it('should handle empty or null dates gracefully in formatLocalTimestamp', () => {
      expect(formatLocalTimestamp(null)).toBe('-');
      expect(formatLocalTimestamp('')).toBe('-');
      expect(formatLocalTimestamp(undefined)).toBe('-');
    });
  });

  describe('2. Job Profitability Mapping to Excel Rows', () => {
    it('should correctly map technical fields to formal Indonesian headers', () => {
      const mockProfitability: SpkJobProfitability[] = [
        {
          spk_id: 'spk-1',
          spk_number: 'SPK-1001',
          customer_name: 'PT Logistik Maju',
          customer_phone: '08123456789',
          vehicle_plate: 'B 1234 CD',
          spk_status: 'ACTIVE',
          registration_date: '2026-10-01T00:00:00.000Z',
          target_date: '2026-10-20T00:00:00.000Z',
          total_revenue: 50_000_000,
          actual_material_cost: 25_000_000,
          actual_labor_cost: 10_000_000,
          actual_overhead_cost: 2_000_000,
          total_cogs: 37_000_000,
          gross_profit: 13_000_000,
          gross_margin_percentage: 26,
          payment_status: 'PARTIAL',
        },
      ];

      const rows = mapProfitabilityToExcelRows(mockProfitability);
      expect(rows).toHaveLength(1);

      const row = rows[0];
      expect(row['Nomor SPK']).toBe('SPK-1001');
      expect(row['Nama Pelanggan']).toBe('PT Logistik Maju');
      expect(row['Pendapatan Tagihan (Rp)']).toBe(50_000_000);
      expect(row['HPP Bahan/Material (Rp)']).toBe(25_000_000);
      expect(row['HPP Jasa/Borongan (Rp)']).toBe(10_000_000);
      expect(row['HPP Overhead Pabrikasi (Rp)']).toBe(2_000_000);
      expect(row['Total HPP Aktual (Rp)']).toBe(37_000_000);
      expect(row['Laba Kotor (Rp)']).toBe(13_000_000);
      expect(row['Margin Kotor (%)']).toBe(26);
      expect(row['Status Penagihan']).toBe('PARTIAL');
    });
  });

  describe('3. WBS Cost Variance Mapping to Excel Rows', () => {
    it('should calculate totals and set SURPLUS status when under budget', () => {
      const mockVariance: WbsCostVariance[] = [
        {
          spk_id: 'spk-1',
          spk_number: 'SPK-1001',
          customer_name: 'PT Logistik Maju',
          vehicle_plate: 'B 1234 CD',
          wbs_stage: 'WBS 1: Pembongkaran',
          total_material_budget: 10_000_000,
          actual_material_spent: 8_000_000,
          material_variance: 2_000_000,
          total_labor_budget: 5_000_000,
          actual_labor_spent: 4_500_000,
          labor_variance: 500_000,
          total_overhead_budget: 1_000_000,
          actual_overhead_spent: 800_000,
          overhead_variance: 200_000,
        },
      ];

      const rows = mapVarianceToExcelRows(mockVariance);
      expect(rows).toHaveLength(1);

      const row = rows[0];
      expect(row['Total Pagu (Rp)']).toBe(16_000_000);
      expect(row['Total Aktual (Rp)']).toBe(13_300_000);
      expect(row['Total Varian (Rp)']).toBe(2_700_000);
      expect(row['Pagu Overhead/FOH (Rp)']).toBe(1_000_000);
      expect(row['Aktual Overhead/FOH (Rp)']).toBe(800_000);
      expect(row['Varian Overhead (Rp)']).toBe(200_000);
      expect(row['Status Anggaran']).toBe('SURPLUS');
    });

    it('should flag OVER BUDGET (DEFISIT) when actual spending exceeds budget', () => {
      const mockVariance: WbsCostVariance[] = [
        {
          spk_id: 'spk-2',
          spk_number: 'SPK-1002',
          customer_name: 'PT Kargo Ekspres',
          vehicle_plate: 'L 5555 ZZ',
          wbs_stage: 'WBS 2: Sasis/Rangka',
          total_material_budget: 10_000_000,
          actual_material_spent: 12_000_000,
          material_variance: -2_000_000,
          total_labor_budget: 5_000_000,
          actual_labor_spent: 5_000_000,
          labor_variance: 0,
          total_overhead_budget: 1_000_000,
          actual_overhead_spent: 1_000_000,
          overhead_variance: 0,
        },
      ];

      const rows = mapVarianceToExcelRows(mockVariance);
      const row = rows[0];
      expect(row['Varian Material (Rp)']).toBe(-2_000_000);
      expect(row['Status Anggaran']).toBe('OVER BUDGET (DEFISIT)');
    });

    it('should flag OVER BUDGET (DEFISIT) when overhead spending exceeds budget', () => {
      const mockVariance: WbsCostVariance[] = [
        {
          spk_id: 'spk-3',
          spk_number: 'SPK-1003',
          customer_name: 'PT Logistik Prima',
          vehicle_plate: 'B 1111 AA',
          wbs_stage: 'WBS 4: Pengecatan',
          total_material_budget: 10_000_000,
          actual_material_spent: 10_000_000,
          material_variance: 0,
          total_labor_budget: 5_000_000,
          actual_labor_spent: 5_000_000,
          labor_variance: 0,
          total_overhead_budget: 1_000_000,
          actual_overhead_spent: 1_800_000,
          overhead_variance: -800_000,
        },
      ];

      const rows = mapVarianceToExcelRows(mockVariance);
      const row = rows[0];
      expect(row['Pagu Overhead/FOH (Rp)']).toBe(1_000_000);
      expect(row['Aktual Overhead/FOH (Rp)']).toBe(1_800_000);
      expect(row['Varian Overhead (Rp)']).toBe(-800_000);
      expect(row['Status Anggaran']).toBe('OVER BUDGET (DEFISIT)');
    });
  });

  describe('4. Inventory Valuation Mapping to Excel Rows', () => {
    it('should correctly format inventory valuation metrics', () => {
      const mockInventory: InventoryValuation[] = [
        {
          material_id: 'mat-1',
          material_name: 'Plat Besi 3mm',
          category: 'Plat & Besi',
          unit: 'lembar',
          current_stock: 50,
          cost_price_hpp: 450_000,
          standard_selling_price: 550_000,
          total_inventory_valuation_hpp: 22_500_000,
          total_inventory_market_value: 27_500_000,
          last_inventory_update: '2026-10-15T00:00:00.000Z',
        },
      ];

      const rows = mapInventoryToExcelRows(mockInventory);
      expect(rows).toHaveLength(1);

      const row = rows[0];
      expect(row['Nama Material / Barang']).toBe('Plat Besi 3mm');
      expect(row['Stok Fisik']).toBe(50);
      expect(row['Harga Pokok HPP (Rp)']).toBe(450_000);
      expect(row['Total Valuasi HPP (Rp)']).toBe(22_500_000);
      expect(row['Total Nilai Pasar (Rp)']).toBe(27_500_000);
    });
  });

  describe('5. Receivables & Aging Mapping to Excel Rows', () => {
    it('should map invoice and handover status cleanly', () => {
      const mockReceivables: ProjectReceivable[] = [
        {
          spk_id: 'spk-1',
          spk_number: 'SPK-5902',
          customer_name: 'PT LOGOSTIC INDO',
          customer_phone: '0811223344',
          vehicle_plate: 'B 1234 GG',
          spk_status: 'ACTIVE',
          qc_status: 'PASS',
          billing_id: 'inv-1',
          invoice_number: 'INV-8FF4C7C0',
          total_billing_amount: 750_000,
          dp_paid: 300_000,
          additional_paid: 0,
          outstanding_balance: 450_000,
          payment_status: 'PARTIAL',
          invoice_date: '2026-10-13T00:00:00.000Z',
          receivable_aging_days: 3,
          handover_clearance_status: 'UNIT SELESAI (TERTAHAN PELUNASAN)',
        },
      ];

      const rows = mapReceivablesToExcelRows(mockReceivables);
      expect(rows).toHaveLength(1);

      const row = rows[0];
      expect(row['Nomor SPK']).toBe('SPK-5902');
      expect(row['Nomor Faktur']).toBe('INV-8FF4C7C0');
      expect(row['Sisa Piutang (Rp)']).toBe(450_000);
      expect(row['Usia Piutang (Hari)']).toBe(3);
      expect(row['Status Serah Terima']).toBe('UNIT SELESAI (TERTAHAN PELUNASAN)');
    });
  });
});
