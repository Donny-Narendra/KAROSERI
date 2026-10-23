import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import { exportRabToExcel, printRabQuotation, getRabItemSourceOrigin, type RabExportItem, type RabExportSpkDetails, type RabExportTotals } from '../rabExport';

// Mock xlsx library
vi.mock('xlsx', async (importOriginal) => {
  const actual = await importOriginal<typeof import('xlsx')>();
  return {
    ...actual,
    writeFile: vi.fn(),
    utils: {
      ...actual.utils,
      aoa_to_sheet: vi.fn((data: any[][], opts?: any) => actual.utils.aoa_to_sheet(data, opts)),
    },
  };
});

describe('rabExport: Source Origin & Package Column Synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRabItemSourceOrigin', () => {
    it('returns formatted package label when package_name is present', () => {
      const item: RabExportItem = {
        wbsCategory: 'Sasis/Rangka',
        type: 'material',
        description: 'Besi UNP 100',
        qty: 5,
        unitPrice: 200000,
        package_name: 'BAK DUMP TRUCK',
      };
      const result = getRabItemSourceOrigin(item);
      expect(result.isPackage).toBe(true);
      expect(result.label).toBe('Paket: BAK DUMP TRUCK');
    });

    it('cleans duplicate "Paket:" prefix if already present in package_name', () => {
      const item: RabExportItem = {
        wbsCategory: 'Pembongkaran',
        type: 'material',
        description: 'Plat Besi 3mm',
        qty: 2,
        unitPrice: 150000,
        package_name: 'Paket: SLEBOR BELAKANG',
      };
      const result = getRabItemSourceOrigin(item);
      expect(result.isPackage).toBe(true);
      expect(result.label).toBe('Paket: SLEBOR BELAKANG');
    });

    it('resolves package from packageName property', () => {
      const item: RabExportItem = {
        wbsCategory: 'Cat/Finishing',
        type: 'labor',
        description: 'Jasa Cat Dasar',
        qty: 1,
        unitPrice: 500000,
        packageName: 'SUB-ASSEMBLY BOX',
      };
      const result = getRabItemSourceOrigin(item);
      expect(result.isPackage).toBe(true);
      expect(result.label).toBe('Paket: SUB-ASSEMBLY BOX');
    });

    it('resolves package from notes fallback when package_name is absent', () => {
      const item: RabExportItem = {
        wbsCategory: 'Dinding/Fabrikasi',
        type: 'material',
        description: 'Engsel Pintu',
        qty: 4,
        unitPrice: 50000,
        notes: 'Bagian dari paket: PINTU BELAKANG',
      };
      const result = getRabItemSourceOrigin(item);
      expect(result.isPackage).toBe(true);
      expect(result.label).toBe('Paket: PINTU BELAKANG');
    });

    it('returns Granular when item is not associated with any package', () => {
      const item: RabExportItem = {
        wbsCategory: 'Kelistrikan/Hidrolik',
        type: 'overhead',
        description: 'Sewa Alat Las',
        qty: 1,
        unitPrice: 100000,
        package_name: null,
      };
      const result = getRabItemSourceOrigin(item);
      expect(result.isPackage).toBe(false);
      expect(result.label).toBe('Granular');
    });
  });

  describe('exportRabToExcel', () => {
    it('generates worksheet containing "Sumber / Paket" between "Deskripsi" and "Tipe"', () => {
      const spkDetails: RabExportSpkDetails = {
        spk_no: 'SPK-2026-001',
        customer_name: 'PT Karoseri Maju',
        vehicle_plate: 'B 1234 CD',
        vehicle_model: 'Hino Dutro',
      };

      const rabItems: RabExportItem[] = [
        {
          wbsCategory: 'Pembongkaran',
          description: 'Bongkar Bodi Lama',
          type: 'labor',
          qty: 1,
          unitPrice: 300000,
          package_name: 'PAKET PEROBAKAN',
        },
        {
          wbsCategory: 'Pembongkaran',
          description: 'Baut Lepas 10mm',
          type: 'material',
          qty: 20,
          unitPrice: 2000,
          package_name: null,
        },
      ];

      const totals: RabExportTotals = {
        material: 40000,
        labor: 300000,
        overhead: 0,
        grandTotal: 340000,
      };

      exportRabToExcel(spkDetails, rabItems, totals);

      expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledTimes(1);
      const generatedData = vi.mocked(XLSX.utils.aoa_to_sheet).mock.calls[0][0] as (string | number)[][];

      // Check header row: ["WBS Category", "Deskripsi", "Sumber / Paket", "Tipe", "Qty", "Harga Satuan", "Subtotal"]
      const headerRow = generatedData.find(row => row && row[0] === 'WBS Category');
      expect(headerRow).toBeDefined();
      expect(headerRow).toEqual([
        'WBS Category',
        'Deskripsi',
        'Sumber / Paket',
        'Tipe',
        'Qty',
        'Harga Satuan',
        'Subtotal',
      ]);

      // Row 1: Package item
      const packageRow = generatedData.find(row => row && row[1] === 'Bongkar Bodi Lama');
      expect(packageRow).toBeDefined();
      expect(packageRow?.[2]).toBe('Paket: PAKET PEROBAKAN');
      expect(packageRow?.[3]).toBe('labor');

      // Row 2: Granular item
      const granularRow = generatedData.find(row => row && row[1] === 'Baut Lepas 10mm');
      expect(granularRow).toBeDefined();
      expect(granularRow?.[2]).toBe('Granular');
      expect(granularRow?.[3]).toBe('material');

      // Check summary totals row offset (5 empty string cells before label)
      const subtotalMaterialRow = generatedData.find(row => row && row.includes('Subtotal Material'));
      expect(subtotalMaterialRow).toBeDefined();
      expect(subtotalMaterialRow?.[5]).toBe('Subtotal Material');
      expect(subtotalMaterialRow?.[6]).toBe(40000);

      expect(XLSX.writeFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('printRabQuotation', () => {
    it('injects package origin badge or subtle subtext into printable quotation HTML', () => {
      let writtenHtml = '';
      const mockPrintWindow = {
        document: {
          write: vi.fn((html: string) => {
            writtenHtml = html;
          }),
          close: vi.fn(),
        },
      };
      vi.spyOn(window, 'open').mockReturnValue(mockPrintWindow as unknown as Window);

      const spkDetails: RabExportSpkDetails = {
        spk_no: 'SPK-2026-002',
        customer_name: 'CV Armada Sukses',
        vehicle_plate: 'L 9999 XY',
      };

      const rabItems: RabExportItem[] = [
        {
          wbsCategory: 'Sasis/Rangka',
          description: 'Sasis Utama Sub-frame',
          type: 'material',
          qty: 2,
          unitPrice: 1500000,
          package_name: 'PAKET CHASSIS REINFORCE',
        },
        {
          wbsCategory: 'Sasis/Rangka',
          description: 'Cat Primer Anti-Karat',
          type: 'material',
          qty: 1,
          unitPrice: 250000,
          package_name: null,
        },
      ];

      const totals: RabExportTotals = {
        material: 3250000,
        labor: 0,
        overhead: 0,
        grandTotal: 3250000,
      };

      printRabQuotation(spkDetails, rabItems, totals);

      expect(mockPrintWindow.document.write).toHaveBeenCalledTimes(1);
      expect(writtenHtml).toContain('📦 Paket: PAKET CHASSIS REINFORCE');
      expect(writtenHtml).toContain('📋 Granular');
      expect(writtenHtml).toContain('Sasis Utama Sub-frame');
      expect(writtenHtml).toContain('Cat Primer Anti-Karat');
    });
  });
});
