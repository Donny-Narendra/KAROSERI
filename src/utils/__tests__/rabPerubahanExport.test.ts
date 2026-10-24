import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import {
  computeRabPerubahanTotals,
  exportRabPerubahanToExcel,
  printRabPerubahanReport,
  type ConsolidatedRabItem,
  type RabPerubahanSpkDetails
} from '../rabPerubahanExport';

// Mock xlsx library
vi.mock('xlsx', async (importOriginal) => {
  const actual = await importOriginal<typeof import('xlsx')>();
  return {
    ...actual,
    writeFile: vi.fn(),
    utils: {
      ...actual.utils,
      aoa_to_sheet: vi.fn((data: any[][], opts?: any) => actual.utils.aoa_to_sheet(data, opts)),
      book_new: vi.fn(() => actual.utils.book_new()),
      book_append_sheet: vi.fn(),
    },
  };
});

describe('rabPerubahanExport: Consolidated Calculations & Export Engines', () => {
  const mockSpk: RabPerubahanSpkDetails = {
    id: 'spk-123',
    spk_no: 'SPK-2026-001',
    customer_name: 'PT Angkutan Logistik',
    vehicle_plate: 'B 9123 KRO',
    vehicle_model: 'Hino Dutro 130 HD',
    status: 'IN_PROGRESS',
  };

  const mockItems: ConsolidatedRabItem[] = [
    // 1. Paket Barang Jadi
    {
      id: 'item-1',
      source_origin: 'RAB',
      source_label: 'RAB',
      is_package: true,
      package_name: 'BAK DUMP STANDAR',
      item_type: 'MATERIAL',
      wbs_stage: 'WBS 2: Sasis/Rangka',
      description: 'Plat Bordes 3mm (Paket)',
      quantity: 4,
      unit: 'lbr',
      cost_price: 500000,
      unit_price: 800000,
      subtotal: 3200000,
      fulfillment_status: 'FULFILLED',
      fulfillment_qty: 4,
    },
    // 2. Material Granular Lepas (RAB)
    {
      id: 'item-2',
      source_origin: 'RAB',
      source_label: 'RAB',
      is_package: false,
      package_name: null,
      item_type: 'MATERIAL',
      wbs_stage: 'WBS 3: Dinding/Fabrikasi',
      description: 'Besi Hollow 40x40',
      quantity: 10,
      unit: 'btg',
      cost_price: 100000,
      unit_price: 150000,
      subtotal: 1500000,
      fulfillment_status: 'PENDING',
      fulfillment_qty: 0,
    },
    // 3. Labor (Change Order)
    {
      id: 'item-3',
      source_origin: 'CHANGE_ORDER',
      source_label: 'Change Order (CO-001)',
      is_package: false,
      package_name: null,
      item_type: 'LABOR',
      wbs_stage: 'WBS 4: Pengecatan',
      description: 'Jasa Pengecatan Tambahan Body',
      quantity: 1,
      unit: 'lot',
      cost_price: 600000,
      unit_price: 1000000,
      subtotal: 1000000,
      fulfillment_status: 'FULFILLED',
      fulfillment_qty: 1,
    },
    // 4. Overhead (RAB)
    {
      id: 'item-4',
      source_origin: 'RAB',
      source_label: 'RAB',
      is_package: false,
      package_name: null,
      item_type: 'OVERHEAD',
      wbs_stage: 'WBS 5: Kelistrikan/Hidrolik',
      description: 'Biaya Listrik Genset & Las Hidrolik',
      quantity: 2,
      unit: 'hari',
      cost_price: 150000,
      unit_price: 250000,
      subtotal: 500000,
      fulfillment_status: 'PENDING',
      fulfillment_qty: 0,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('computeRabPerubahanTotals', () => {
    it('correctly calculates separated 4-pillar profits and totals', () => {
      const totals = computeRabPerubahanTotals(mockItems);

      // Package: Item 1 -> Rev: 4*800k = 3.2M, Cost: 4*500k = 2.0M, Profit: 1.2M
      expect(totals.packageRevenue).toBe(3200000);
      expect(totals.packageCost).toBe(2000000);
      expect(totals.packageProfit).toBe(1200000);

      // Granular Material: Item 2 -> Rev: 10*150k = 1.5M, Cost: 10*100k = 1.0M, Profit: 500k
      expect(totals.granularMaterialRevenue).toBe(1500000);
      expect(totals.granularMaterialCost).toBe(1000000);
      expect(totals.granularMaterialProfit).toBe(500000);

      // Labor: Item 3 -> Rev: 1*1M = 1.0M, Cost: 1*600k = 600k, Profit: 400k
      expect(totals.laborRevenue).toBe(1000000);
      expect(totals.laborCost).toBe(600000);
      expect(totals.laborProfit).toBe(400000);

      // Overhead: Item 4 -> Rev: 2*250k = 500k, Cost: 2*150k = 300k, Profit: 200k
      expect(totals.overheadRevenue).toBe(500000);
      expect(totals.overheadCost).toBe(300000);
      expect(totals.overheadProfit).toBe(200000);

      // Total Revenue: 3.2M + 1.5M + 1.0M + 0.5M = 6.2M
      expect(totals.totalRevenue).toBe(6200000);

      // Total Cost: 2.0M + 1.0M + 0.6M + 0.3M = 3.9M
      expect(totals.totalCogs).toBe(3900000);

      // Total Profit: 6.2M - 3.9M = 2.3M
      expect(totals.totalProfit).toBe(2300000);

      // Margin %: (2.3M / 6.2M) * 100 = 37.1%
      expect(totals.marginPercentage).toBeCloseTo(37.1, 1);

      // Material fulfillment tracking: 2 material items (item 1 fulfilled, item 2 pending)
      expect(totals.materialTotalCount).toBe(2);
      expect(totals.materialFulfilledCount).toBe(1);
      expect(totals.materialFulfilledPercentage).toBe(50);
    });

    it('returns zeroes when items array is empty', () => {
      const totals = computeRabPerubahanTotals([]);
      expect(totals.totalRevenue).toBe(0);
      expect(totals.totalCogs).toBe(0);
      expect(totals.totalProfit).toBe(0);
      expect(totals.materialTotalCount).toBe(0);
      expect(totals.materialFulfilledPercentage).toBe(100);
    });

    it('correctly segregates package assembly labor into itemized packages and isolates granular labor', () => {
      const itemsWithPackageLabor: ConsolidatedRabItem[] = [
        {
          id: 'l1',
          source_origin: 'RAB',
          source_label: 'RAB',
          is_package: true,
          package_name: 'BAK DUMP STANDAR',
          item_type: 'LABOR',
          wbs_stage: 'WBS 1: Pembongkaran',
          description: 'Jasa Las Sub-Assembly (Paket)',
          quantity: 1,
          unit: 'lot',
          cost_price: 80000,
          unit_price: 100000,
          subtotal: 100000,
          fulfillment_status: 'FULFILLED',
          fulfillment_qty: 1,
        },
        {
          id: 'l2',
          source_origin: 'RAB',
          source_label: 'RAB',
          is_package: true,
          package_name: 'BAK DUMP STANDAR',
          item_type: 'LABOR',
          wbs_stage: 'WBS 2: Sasis/Rangka',
          description: 'Jasa Pasang Main Frame (Paket)',
          quantity: 1,
          unit: 'lot',
          cost_price: 900000,
          unit_price: 1247113,
          subtotal: 1247113,
          fulfillment_status: 'FULFILLED',
          fulfillment_qty: 1,
        },
        {
          id: 'l3',
          source_origin: 'RAB',
          source_label: 'RAB',
          is_package: false,
          package_name: null,
          item_type: 'LABOR',
          wbs_stage: 'WBS 3: Dinding/Fabrikasi',
          description: 'Jasa Pasang Engsel Granular',
          quantity: 1,
          unit: 'lot',
          cost_price: 120000,
          unit_price: 150000,
          subtotal: 150000,
          fulfillment_status: 'PENDING',
          fulfillment_qty: 0,
        },
        {
          id: 'l4',
          source_origin: 'CHANGE_ORDER',
          source_label: 'Change Order (CO-001)',
          is_package: true,
          package_name: 'PAKET TAMBAHAN HIDROLIK',
          item_type: 'LABOR',
          wbs_stage: 'WBS 5: Kelistrikan/Hidrolik',
          description: 'Jasa Instalasi PTO Hidrolik (Paket)',
          quantity: 1,
          unit: 'lot',
          cost_price: 1000000,
          unit_price: 1385681,
          subtotal: 1385681,
          fulfillment_status: 'FULFILLED',
          fulfillment_qty: 1,
        },
      ];

      const totals = computeRabPerubahanTotals(itemsWithPackageLabor);

      // Granular labor is strictly isolated (only item l3: cost 120k, rev 150k, profit 30k)
      expect(totals.laborCost).toBe(120000);
      expect(totals.laborRevenue).toBe(150000);
      expect(totals.laborProfit).toBe(30000);

      // Package assembly labor is captured inside package totals
      expect(totals.packageCost).toBe(1980000); // 80k + 900k + 1000k
      expect(totals.packageRevenue).toBe(2732794); // 100k + 1247113 + 1385681
      expect(totals.packageProfit).toBe(752794);

      // Itemized packages are exposed
      expect(totals.itemizedPackages).toBeDefined();
      expect(totals.itemizedPackages).toHaveLength(2);
      const bakPkg = totals.itemizedPackages?.find(p => p.packageName.includes('BAK DUMP STANDAR'));
      expect(bakPkg?.laborCost).toBe(980000); // 80k + 900k
      const hydPkg = totals.itemizedPackages?.find(p => p.packageName.includes('TAMBAHAN HIDROLIK'));
      expect(hydPkg?.laborCost).toBe(1000000);
    });
  });

  describe('exportRabPerubahanToExcel', () => {
    it('generates an excel workbook and calls writeFile with sanitized filename', () => {
      exportRabPerubahanToExcel(mockSpk, mockItems);

      expect(XLSX.writeFile).toHaveBeenCalledTimes(1);
      const filenameArg = (XLSX.writeFile as any).mock.calls[0][1];
      expect(filenameArg).toBe('RAB_Perubahan_SPK-2026-001_B_9123_KRO.xlsx');

      expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalled();
      const sheetData = (XLSX.utils.aoa_to_sheet as any).mock.calls[0][0];

      // Verify Title & SPK info in rows
      expect(sheetData[0][0]).toContain('LAPORAN KONSOLIDASI RAB PERUBAHAN');
      expect(sheetData[2]).toEqual(['No. SPK', 'SPK-2026-001']);
      expect(sheetData[3]).toEqual(['Nama Pelanggan', 'PT Angkutan Logistik']);
      expect(sheetData[4]).toEqual(['Nopol Kendaraan', 'B 9123 KRO']);

      // Verify Column headers
      const headerRow = sheetData[10];
      expect(headerRow).toContain('Asal Input');
      expect(headerRow).toContain('Metode Entry');
      expect(headerRow).toContain('Kategori Tipe');
      expect(headerRow).toContain('Alokasi WBS');
      expect(headerRow).toContain('Status Realisasi / Gudang');
    });
  });

  describe('printRabPerubahanReport', () => {
    it('opens a new window and injects printable document with official letterhead', () => {
      const mockDocument = {
        write: vi.fn(),
        close: vi.fn(),
      };
      const mockPrintWindow = {
        document: mockDocument,
      };

      vi.spyOn(window, 'open').mockReturnValue(mockPrintWindow as any);

      printRabPerubahanReport(mockSpk, mockItems);

      expect(window.open).toHaveBeenCalledWith('', '_blank');
      expect(mockDocument.write).toHaveBeenCalled();
      expect(mockDocument.close).toHaveBeenCalled();

      const htmlContent = mockDocument.write.mock.calls[0][0];
      expect(htmlContent).toContain('ROBEL KAROSERI');
      expect(htmlContent).toContain('Laporan RAB Perubahan & Realisasi');
      expect(htmlContent).toContain('SPK-2026-001');
      expect(htmlContent).toContain('B 9123 KRO');
      expect(htmlContent).toContain('Plat Bordes 3mm (Paket)');
      expect(htmlContent).toContain('Jasa Pengecatan Tambahan Body');
      expect(htmlContent).toContain('Disiapkan Oleh');
      expect(htmlContent).toContain('Diverifikasi Oleh');
      expect(htmlContent).toContain('Disetujui Oleh');
    });
  });
});
