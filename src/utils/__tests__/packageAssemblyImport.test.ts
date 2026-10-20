import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isLaborKeyword, isOverheadKeyword, resolveItemType } from '../itemClassification';
import { packageService } from '../../services/packageService';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  };
});

describe('Assembly Package Import & item_type Propagation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Keyword Heuristic Classification', () => {
    it('detects labor keywords correctly regardless of casing', () => {
      expect(isLaborKeyword('TUKANG LAS RANGKA')).toBe(true);
      expect(isLaborKeyword('Jasa Pemasangan Hidrolik')).toBe(true);
      expect(isLaborKeyword('Ongkos Borongan Cat')).toBe(true);
      expect(isLaborKeyword('Upah Perakitan Sasis')).toBe(true);
      expect(isLaborKeyword('Labor Mekanik')).toBe(true);
      expect(isLaborKeyword('Besi UNP 100')).toBe(false);
      expect(isLaborKeyword(null)).toBe(false);
    });

    it('detects overhead keywords correctly regardless of casing', () => {
      expect(isOverheadKeyword('LISTRIK WORKSHOP')).toBe(true);
      expect(isOverheadKeyword('Sewa Bay Assembly')).toBe(true);
      expect(isOverheadKeyword('Bay Rate Line 4')).toBe(true);
      expect(isOverheadKeyword('Sewa Kompressor')).toBe(true);
      expect(isOverheadKeyword('Overhead Pabrik')).toBe(true);
      expect(isOverheadKeyword('Pipa Hollow')).toBe(false);
      expect(isOverheadKeyword(undefined)).toBe(false);
    });

    it('resolves item type with priority order: explicit -> master material -> keywords', () => {
      // Explicit package item type takes precedence
      expect(resolveItemType('LABOR', 'MATERIAL', 'Pipa')).toBe('LABOR');
      expect(resolveItemType('OVERHEAD', 'MATERIAL', 'Cat')).toBe('OVERHEAD');

      // Master catalog item type takes precedence if package item type is missing
      expect(resolveItemType(null, 'LABOR', 'General Item')).toBe('LABOR');
      expect(resolveItemType(undefined, 'OVERHEAD', 'General Item')).toBe('OVERHEAD');

      // Keyword heuristics fallback if neither is specified
      expect(resolveItemType(null, null, 'Tukang Cat')).toBe('LABOR');
      expect(resolveItemType(undefined, undefined, 'Sewa Bay')).toBe('OVERHEAD');
      expect(resolveItemType(null, null, 'Plat Bordes 3mm')).toBe('MATERIAL');
    });
  });

  describe('packageService.importAssemblyToRab', () => {
    it('imports package items into rab_items mapping item_type from Master & keywords without hardcoded MATERIAL', async () => {
      const mockPackageData = {
        id: 'pkg-dump-truck',
        name: 'Paket Dump Truck 8m3',
        selling_price: 65000000,
        items: [
          {
            id: 'item-1',
            item_type: 'MATERIAL',
            material_id: 'mat-plat-besi',
            name: 'Plat Besi 4mm',
            quantity: 12,
            cost_per_unit: 450000,
            waste_factor: 5,
            wbs_stage: 'Sasis/Rangka',
            material: {
              id: 'mat-plat-besi',
              name: 'Plat Besi 4mm',
              unit: 'lembar',
              item_type: 'MATERIAL',
              waste_factor_percentage: 5,
              cost_price: 400000,
            },
          },
          {
            id: 'item-2',
            item_type: 'LABOR',
            material_id: 'mat-tukang-welder',
            labor_name: 'Tukang Las Konstruksi',
            quantity: 2,
            cost_per_unit: 1200000,
            waste_factor: 0,
            wbs_stage: 'Dinding/Fabrikasi',
            material: {
              id: 'mat-tukang-welder',
              name: 'Tukang Las Konstruksi',
              unit: 'lot',
              item_type: 'LABOR',
              cost_price: 1200000,
            },
          },
          {
            id: 'item-3',
            // Corrupt legacy item_type in package_items: 'MATERIAL' but master catalog & name is OVERHEAD
            item_type: null,
            material_id: 'mat-bay-rate',
            name: 'Sewa Bay Heavy Line',
            quantity: 3,
            cost_per_unit: 200000,
            wbs_stage: 'Cat/Finishing',
            material: {
              id: 'mat-bay-rate',
              name: 'Sewa Bay Heavy Line',
              unit: 'hari',
              item_type: 'OVERHEAD',
              cost_price: 200000,
            },
          },
          {
            id: 'item-4',
            // Fallback keyword detection for labor
            item_type: null,
            material_id: null,
            labor_name: 'Ongkos Tukang Dempul & Cat',
            quantity: 1,
            cost_per_unit: 850000,
            wbs_stage: 'Cat/Finishing',
            material: null,
          },
        ],
      };

      let insertedRabItems: any[] = [];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'product_packages') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockPackageData, error: null }),
              }),
            }),
          };
        }
        if (table === 'rab_estimations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'est-spk-100' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'rab_items') {
          return {
            insert: vi.fn().mockImplementation((payload) => {
              insertedRabItems = payload;
              return {
                select: vi.fn().mockResolvedValue({ data: payload, error: null }),
              };
            }),
          };
        }
        return { select: vi.fn() };
      });

      const result = await packageService.importAssemblyToRab('spk-100', 'pkg-dump-truck');

      expect(result).toHaveLength(4);
      expect(insertedRabItems).toHaveLength(4);

      // 1. Material item
      const item1 = insertedRabItems[0];
      expect(item1.spk_id).toBe('spk-100');
      expect(item1.item_type).toBe('MATERIAL');
      expect(item1.material_id).toBe('mat-plat-besi');
      expect(item1.material_name).toBe('Plat Besi 4mm');
      expect(item1.unit).toBe('lembar');
      expect(item1.quantity).toBe(12);
      expect(item1.unit_price).toBe(450000);
      expect(item1.cost_price).toBe(400000);
      expect(item1.subtotal).toBe(12 * 450000);
      expect(item1.waste_factor).toBeUndefined();
      expect(item1.wbs_stage).toBe('Sasis/Rangka');

      // 2. Labor item (material_id must be null for non-material in RAB items)
      const item2 = insertedRabItems[1];
      expect(item2.spk_id).toBe('spk-100');
      expect(item2.item_type).toBe('LABOR');
      expect(item2.material_id).toBeNull();
      expect(item2.material_name).toBe('Tukang Las Konstruksi');
      expect(item2.unit).toBe('lot');
      expect(item2.quantity).toBe(2);
      expect(item2.labor_hours).toBe(2);
      expect(item2.labor_rate).toBe(1200000);
      expect(item2.subtotal).toBe(2 * 1200000);
      expect(item2.waste_factor).toBeUndefined();

      // 3. Overhead item (inherited from master material.item_type = 'OVERHEAD')
      const item3 = insertedRabItems[2];
      expect(item3.spk_id).toBe('spk-100');
      expect(item3.item_type).toBe('OVERHEAD');
      expect(item3.material_id).toBeNull();
      expect(item3.material_name).toBe('Sewa Bay Heavy Line');
      expect(item3.unit).toBe('hari');
      expect(item3.quantity).toBe(3);
      expect(item3.overhead_hours).toBe(24);
      expect(item3.overhead_rate).toBe(200000 / 8);
      expect(item3.subtotal).toBe(3 * 200000);
      expect(item3.waste_factor).toBeUndefined();

      // 4. Labor item resolved via keyword heuristics
      const item4 = insertedRabItems[3];
      expect(item4.item_type).toBe('LABOR');
      expect(item4.material_id).toBeNull();
      expect(item4.material_name).toBe('Ongkos Tukang Dempul & Cat');
      expect(item4.unit).toBe('lot');
      expect(item4.waste_factor).toBeUndefined();
    });
  });
});
