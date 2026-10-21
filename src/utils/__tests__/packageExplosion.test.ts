import { describe, it, expect } from 'vitest';
import { 
  mapToWbsStage, 
  explodePackageToDraftItems, 
  WBS_STAGES 
} from '../packageExplosion';
import type { ProductPackage } from '../../types/package';

describe('Utility: packageExplosion (BOM Explosion & WBS Allocation for Change Order)', () => {
  describe('mapToWbsStage', () => {
    it('maps Indonesian keywords and stage names to official WBS stages', () => {
      expect(mapToWbsStage('Pembongkaran')).toBe(WBS_STAGES[0]); // WBS 1: Pembongkaran
      expect(mapToWbsStage('Sasis/Rangka')).toBe(WBS_STAGES[1]); // WBS 2: Sasis/Rangka
      expect(mapToWbsStage('Dinding/Fabrikasi')).toBe(WBS_STAGES[2]); // WBS 3: Dinding/Fabrikasi
      expect(mapToWbsStage('Cat/Finishing')).toBe(WBS_STAGES[3]); // WBS 4: Cat/Finishing
      expect(mapToWbsStage('Kelistrikan/Hidrolik')).toBe(WBS_STAGES[4]); // WBS 5: Kelistrikan/Hidrolik
    });

    it('handles case-insensitive matching and partial keywords', () => {
      expect(mapToWbsStage('pembongkaran sasis lama')).toBe(WBS_STAGES[0]);
      expect(mapToWbsStage('modifikasi rangka')).toBe(WBS_STAGES[1]);
      expect(mapToWbsStage('fabrikasi bak')).toBe(WBS_STAGES[2]);
      expect(mapToWbsStage('pengecatan dasar')).toBe(WBS_STAGES[3]);
      expect(mapToWbsStage('instalasi hidrolik')).toBe(WBS_STAGES[4]);
    });

    it('falls back to provided fallback or WBS 2 when input is null, undefined, or unknown', () => {
      expect(mapToWbsStage(null)).toBe(WBS_STAGES[1]);
      expect(mapToWbsStage(undefined)).toBe(WBS_STAGES[1]);
      expect(mapToWbsStage('tahap_acak_tak_dikenal', WBS_STAGES[3])).toBe(WBS_STAGES[3]);
    });
  });

  describe('explodePackageToDraftItems', () => {
    const mockPackage: ProductPackage = {
      id: 'pkg-dudukan-slebor',
      name: 'HPP DUDUKAN SLEBOR',
      selling_price: 3500000,
      items: [
        {
          id: 'pi-1',
          item_type: 'MATERIAL',
          material_id: 'mat-plat-3mm',
          labor_name: null,
          quantity: 2,
          cost_per_unit: 450000,
          material: {
            id: 'mat-plat-3mm',
            name: 'Plat Besi Bordes 3mm',
            unit: 'lembar',
            unit_price: 600000,
            selling_price: 600000,
            cost_price: 450000,
            current_stock: 15,
            minimum_stock: 0,
            waste_factor_percentage: 0,
            category: 'RAW_MATERIAL',
            item_type: 'MATERIAL',
          },
          default_wbs_allocation: {
            'Pembongkaran': 0.5,
            'Sasis/Rangka': 1.5,
          },
        },
        {
          id: 'pi-2',
          item_type: 'LABOR',
          material_id: 'mat-tukang-las',
          labor_name: 'Tukang Las Konstruksi',
          quantity: 4,
          cost_per_unit: 125000,
          material: {
            id: 'mat-tukang-las',
            name: 'Tukang Las Konstruksi',
            unit: 'jam',
            unit_price: 175000,
            selling_price: 175000,
            cost_price: 125000,
            current_stock: 99,
            minimum_stock: 0,
            waste_factor_percentage: 0,
            category: 'labor',
            item_type: 'LABOR',
          },
          default_wbs_allocation: {
            'Sasis/Rangka': 4,
          },
        },
        {
          id: 'pi-3',
          item_type: 'OVERHEAD',
          material_id: null,
          labor_name: 'Sewa Alat Derek & Gas Blender',
          quantity: 1,
          cost_per_unit: 200000,
          default_wbs_allocation: {},
        },
      ],
    };

    it('returns empty array when package items are missing or empty', () => {
      expect(explodePackageToDraftItems({ id: 'empty', name: 'Empty', selling_price: 0 }, 'SINGLE')).toEqual([]);
      expect(explodePackageToDraftItems({ id: 'empty', name: 'Empty', selling_price: 0, items: [] }, 'SINGLE')).toEqual([]);
    });

    it('explodes all components to a Single WBS Target when targetWbsMode is SINGLE', () => {
      const singleTarget = 'WBS 3: Dinding/Fabrikasi';
      const items = explodePackageToDraftItems(mockPackage, 'SINGLE', singleTarget, 1);

      expect(items).toHaveLength(3);
      items.forEach(item => {
        expect(item.wbs_stage).toBe(singleTarget);
        expect(item.notes).toBe('[Paket: HPP DUDUKAN SLEBOR]');
      });

      // Material
      expect(items[0].item_type).toBe('MATERIAL');
      expect(items[0].material_id).toBe('mat-plat-3mm');
      expect(items[0].item_name).toBe('Plat Besi Bordes 3mm');
      expect(items[0].quantity).toBe(2);
      expect(items[0].cost_price).toBe(450000);

      // Labor
      expect(items[1].item_type).toBe('LABOR');
      expect(items[1].item_name).toBe('Tukang Las Konstruksi');
      expect(items[1].quantity).toBe(4);
      expect(items[1].cost_price).toBe(125000);

      // Overhead
      expect(items[2].item_type).toBe('OVERHEAD');
      expect(items[2].item_name).toBe('Sewa Alat Derek & Gas Blender');
      expect(items[2].quantity).toBe(1);
      expect(items[2].cost_price).toBe(200000);
    });

    it('explodes multi-WBS items into separate rows per default_wbs_allocation', () => {
      const items = explodePackageToDraftItems(mockPackage, 'MULTI', WBS_STAGES[1], 1);

      // Item 1 (Plat) has default_wbs_allocation: 0.5 in Pembongkaran and 1.5 in Sasis/Rangka -> 2 rows
      // Item 2 (Labor) has default_wbs_allocation: 4 in Sasis/Rangka -> 1 row
      // Item 3 (Overhead) has empty allocation -> falls back to singleWbsStage (WBS 2) -> 1 row
      // Total: 4 rows
      expect(items).toHaveLength(4);

      // Plat - Pembongkaran
      expect(items[0].item_name).toBe('Plat Besi Bordes 3mm');
      expect(items[0].wbs_stage).toBe(WBS_STAGES[0]); // WBS 1: Pembongkaran
      expect(items[0].quantity).toBe(0.5);

      // Plat - Sasis/Rangka
      expect(items[1].item_name).toBe('Plat Besi Bordes 3mm');
      expect(items[1].wbs_stage).toBe(WBS_STAGES[1]); // WBS 2: Sasis/Rangka
      expect(items[1].quantity).toBe(1.5);

      // Labor - Sasis/Rangka
      expect(items[2].item_name).toBe('Tukang Las Konstruksi');
      expect(items[2].wbs_stage).toBe(WBS_STAGES[1]);
      expect(items[2].quantity).toBe(4);

      // Overhead - Fallback
      expect(items[3].item_name).toBe('Sewa Alat Derek & Gas Blender');
      expect(items[3].wbs_stage).toBe(WBS_STAGES[1]);
      expect(items[3].quantity).toBe(1);
    });

    it('multiplies all quantities when packageMultiplier > 1', () => {
      const multiplier = 3;
      const items = explodePackageToDraftItems(mockPackage, 'SINGLE', WBS_STAGES[1], multiplier);

      expect(items[0].quantity).toBe(2 * 3); // 6
      expect(items[1].quantity).toBe(4 * 3); // 12
      expect(items[2].quantity).toBe(1 * 3); // 3
    });

    it('distributes package selling price proportionally to HPP and computes margin ratio', () => {
      // Total BOM HPP = (2 * 450000) + (4 * 125000) + (1 * 200000) = 900000 + 500000 + 200000 = 1,600,000
      // Package selling price = 3,500,000
      // Margin ratio = 3500000 / 1600000 = 2.1875
      const items = explodePackageToDraftItems(mockPackage, 'SINGLE', WBS_STAGES[1], 1);

      // Unit prices should be rounded(costPrice * 2.1875)
      expect(items[0].unit_price).toBe(Math.round(450000 * (3500000 / 1600000))); // 984375
      expect(items[1].unit_price).toBe(Math.round(125000 * (3500000 / 1600000))); // 273438
      expect(items[2].unit_price).toBe(Math.round(200000 * (3500000 / 1600000))); // 437500

      const totalExplodedSelling = items.reduce((sum, it) => sum + (it.quantity * it.unit_price), 0);
      // Close to 3,500,000 (within small rounding differences)
      expect(Math.abs(totalExplodedSelling - 3500000)).toBeLessThan(10);
    });
  });
});
