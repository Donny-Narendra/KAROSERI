import { describe, it, expect } from 'vitest';
import { getRabItemCompositeKey, deduplicateRabItems } from '../rabDeduplication';

describe('rabDeduplication Utility', () => {
  describe('getRabItemCompositeKey', () => {
    it('produces identical keys for camelCase and snake_case versions of the same item', () => {
      const frontendItem = {
        id: 'fe-1',
        rabEstimationId: 'est-123',
        packageId: 'pkg-01',
        materialId: 'mat-55',
        description: 'Plat Besi 2mm',
        wbsCategory: 'Sasis/Rangka',
        type: 'material',
        qty: 5,
        unitPrice: 150000,
        costPrice: 120000,
      };

      const dbItem = {
        id: 'db-1',
        rab_estimation_id: 'est-123',
        package_id: 'pkg-01',
        material_id: 'mat-55',
        description: 'Plat Besi 2mm',
        wbs_category: 'Sasis/Rangka',
        item_type: 'MATERIAL',
        quantity: 5,
        unit_price: 150000,
        cost_price: 120000,
      };

      expect(getRabItemCompositeKey(frontendItem)).toBe(getRabItemCompositeKey(dbItem));
    });

    it('distinguishes items with different WBS categories', () => {
      const itemA = {
        materialId: 'mat-1',
        description: 'Plat Besi',
        wbsCategory: 'Pembongkaran',
        type: 'material',
        qty: 1,
        unitPrice: 10000,
      };
      const itemB = {
        materialId: 'mat-1',
        description: 'Plat Besi',
        wbsCategory: 'Sasis/Rangka',
        type: 'material',
        qty: 1,
        unitPrice: 10000,
      };
      expect(getRabItemCompositeKey(itemA)).not.toBe(getRabItemCompositeKey(itemB));
    });

    it('distinguishes items from different source origins (RAB vs CHANGE_ORDER)', () => {
      const rabItem = {
        source_origin: 'RAB',
        description: 'Pipa Seamless',
        wbs_stage: 'Sasis/Rangka',
        item_type: 'MATERIAL',
        quantity: 2,
        unit_price: 250000,
      };
      const coItem = {
        source_origin: 'CHANGE_ORDER',
        change_order_id: 'co-88',
        description: 'Pipa Seamless',
        wbs_stage: 'Sasis/Rangka',
        item_type: 'MATERIAL',
        quantity: 2,
        unit_price: 250000,
      };
      expect(getRabItemCompositeKey(rabItem)).not.toBe(getRabItemCompositeKey(coItem));
    });
  });

  describe('deduplicateRabItems', () => {
    it('removes duplicate database rows with different IDs but identical contents', () => {
      // Simulates the SPK-3093 double-insert issue
      const duplicatedItems = [
        {
          id: 'row-1',
          rab_estimation_id: 'est-3093',
          package_id: 'pkg-box',
          material_id: 'mat-plat',
          description: 'Plat Bordes 3mm',
          wbs_category: 'Dinding/Fabrikasi',
          item_type: 'MATERIAL',
          quantity: 4,
          unit_price: 350000,
          cost_price: 280000,
        },
        {
          id: 'row-2', // Second row inserted inadvertently
          rab_estimation_id: 'est-3093',
          package_id: 'pkg-box',
          material_id: 'mat-plat',
          description: 'Plat Bordes 3mm',
          wbs_category: 'Dinding/Fabrikasi',
          item_type: 'MATERIAL',
          quantity: 4,
          unit_price: 350000,
          cost_price: 280000,
        },
        {
          id: 'row-3', // Distinct item
          rab_estimation_id: 'est-3093',
          package_id: 'pkg-box',
          material_id: 'mat-cat',
          description: 'Cat Polyurethane',
          wbs_category: 'Cat/Finishing',
          item_type: 'MATERIAL',
          quantity: 2,
          unit_price: 180000,
          cost_price: 140000,
        },
      ];

      const deduped = deduplicateRabItems(duplicatedItems);
      expect(deduped).toHaveLength(2);
      expect(deduped[0].id).toBe('row-1');
      expect(deduped[1].id).toBe('row-3');
    });

    it('removes duplicate rows with the exact same ID', () => {
      const items = [
        { id: 'same-id', description: 'Item 1' },
        { id: 'same-id', description: 'Item 1 copy' },
        { id: 'diff-id', description: 'Item 2' },
      ];

      const deduped = deduplicateRabItems(items);
      expect(deduped).toHaveLength(2);
      expect(deduped.map(i => i.id)).toEqual(['same-id', 'diff-id']);
    });

    it('handles empty or invalid inputs gracefully', () => {
      expect(deduplicateRabItems([])).toEqual([]);
      expect(deduplicateRabItems(null as any)).toEqual([]);
      expect(deduplicateRabItems(undefined as any)).toEqual([]);
    });

    it('supports custom key functions', () => {
      const items = [
        { id: '1', code: 'A', name: 'Alpha' },
        { id: '2', code: 'A', name: 'Alpha Duplicate' },
        { id: '3', code: 'B', name: 'Beta' },
      ];

      const deduped = deduplicateRabItems(items, {
        keyFn: (item) => item.code,
      });

      expect(deduped).toHaveLength(2);
      expect(deduped.map(i => i.code)).toEqual(['A', 'B']);
    });
  });
});
