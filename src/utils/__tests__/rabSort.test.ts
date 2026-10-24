import { describe, it, expect } from 'vitest';
import { getWbsWeight, sortRabItems, isItemFromPackage, type SortableRabItem } from '../rabSort';

describe('rabSort: Centralized RAB Sorting Utility', () => {
  describe('getWbsWeight', () => {
    it('correctly assigns weight 1 to Pembongkaran / Stage 1', () => {
      expect(getWbsWeight('WBS 1: Pembongkaran')).toBe(1);
      expect(getWbsWeight('Pembongkaran')).toBe(1);
      expect(getWbsWeight('tahap 1')).toBe(1);
    });

    it('correctly assigns weight 2 to Sasis / Rangka / Stage 2', () => {
      expect(getWbsWeight('WBS 2: Sasis/Rangka')).toBe(2);
      expect(getWbsWeight('Sasis/Rangka')).toBe(2);
      expect(getWbsWeight('Rangka')).toBe(2);
    });

    it('correctly assigns weight 3 to Dinding / Fabrikasi / Stage 3', () => {
      expect(getWbsWeight('WBS 3: Dinding/Fabrikasi')).toBe(3);
      expect(getWbsWeight('Dinding/Fabrikasi')).toBe(3);
      expect(getWbsWeight('Fabrikasi')).toBe(3);
    });

    it('correctly assigns weight 4 to Pengecatan / Cat / Finishing / Stage 4', () => {
      expect(getWbsWeight('WBS 4: Pengecatan')).toBe(4);
      expect(getWbsWeight('Cat/Finishing')).toBe(4);
      expect(getWbsWeight('pengecatan akhir')).toBe(4);
    });

    it('correctly assigns weight 5 to Kelistrikan / Hidrolik / Stage 5', () => {
      expect(getWbsWeight('WBS 5: Kelistrikan/Hidrolik')).toBe(5);
      expect(getWbsWeight('Kelistrikan/Hidrolik')).toBe(5);
      expect(getWbsWeight('Hidrolik silinder')).toBe(5);
    });

    it('assigns weight 99 for unknown or undefined categories', () => {
      expect(getWbsWeight(undefined)).toBe(99);
      expect(getWbsWeight(null)).toBe(99);
      expect(getWbsWeight('')).toBe(99);
      expect(getWbsWeight('Lain-lain')).toBe(99);
    });
  });

  describe('isItemFromPackage', () => {
    it('detects package when package_name, packageName, package_id, or packageId is set', () => {
      expect(isItemFromPackage({ package_name: 'Paket Box' })).toBe(true);
      expect(isItemFromPackage({ packageName: 'Paket Box' })).toBe(true);
      expect(isItemFromPackage({ package_id: 'pkg-123' })).toBe(true);
      expect(isItemFromPackage({ packageId: 'pkg-123' })).toBe(true);
    });

    it('detects package from notes with Paket prefix', () => {
      expect(isItemFromPackage({ notes: 'Paket: DUMP TRUCK' })).toBe(true);
      expect(isItemFromPackage({ notes: 'Bagian dari paket: BOX BESI' })).toBe(true);
    });

    it('returns false for granular items without package metadata', () => {
      expect(isItemFromPackage({})).toBe(false);
      expect(isItemFromPackage({ notes: 'Custom granular material' })).toBe(false);
      expect(isItemFromPackage({ package_name: null, packageId: null })).toBe(false);
    });
  });

  describe('sortRabItems', () => {
    it('returns empty array when input is null, undefined, or empty', () => {
      expect(sortRabItems([] as any)).toEqual([]);
      expect(sortRabItems(null as any)).toEqual([]);
      expect(sortRabItems(undefined as any)).toEqual([]);
    });

    it('sorts primary by WBS stage ascending (1 -> 2 -> 3 -> 4 -> 5)', () => {
      const items: SortableRabItem[] = [
        { id: '1', description: 'Kabel Hidrolik', wbsCategory: 'Kelistrikan/Hidrolik' },
        { id: '2', description: 'Plat Besi', wbsCategory: 'Sasis/Rangka' },
        { id: '3', description: 'Bongkar Bodi', wbsCategory: 'Pembongkaran' },
        { id: '4', description: 'Dinding Plat', wbsCategory: 'Dinding/Fabrikasi' },
        { id: '5', description: 'Cat Primer', wbsCategory: 'Cat/Finishing' },
      ];

      const sorted = sortRabItems(items);
      expect(sorted.map(i => i.id)).toEqual(['3', '2', '4', '5', '1']);
    });

    it('sorts secondary by package items before granular within the same WBS stage', () => {
      const items: SortableRabItem[] = [
        { id: 'gran-1', description: 'Baut Hex', wbsCategory: 'Sasis/Rangka' },
        { id: 'pkg-1', description: 'Besi UNP', wbsCategory: 'Sasis/Rangka', package_name: 'Paket Sasis' },
        { id: 'gran-2', description: 'Mur 10mm', wbsCategory: 'Sasis/Rangka' },
        { id: 'pkg-2', description: 'Kanal C', wbsCategory: 'Sasis/Rangka', notes: 'Paket: Sasis Sub' },
      ];

      const sorted = sortRabItems(items);
      // Both packages first (alphabetical by name: 'Besi UNP' then 'Kanal C'), then granulars ('Baut Hex' then 'Mur 10mm')
      expect(sorted.map(i => i.id)).toEqual(['pkg-1', 'pkg-2', 'gran-1', 'gran-2']);
    });

    it('sorts tertiary alphabetically by description/material_name case-insensitively', () => {
      const items: SortableRabItem[] = [
        { id: '1', description: 'zink chromate', wbsCategory: 'Cat/Finishing' },
        { id: '2', description: 'Amplas Kasar', wbsCategory: 'Cat/Finishing' },
        { id: '3', description: 'cat dasar epoxy', wbsCategory: 'Cat/Finishing' },
        { id: '4', description: 'Bahan Thinner', wbsCategory: 'Cat/Finishing' },
      ];

      const sorted = sortRabItems(items);
      expect(sorted.map(i => i.id)).toEqual(['2', '4', '3', '1']);
    });

    it('correctly handles snake_case fields from database records', () => {
      const items = [
        { id: 'item-2', material_name: 'Kabel Aki', wbs_stage: 'WBS 5: Kelistrikan/Hidrolik' },
        { id: 'item-1', material_name: 'Baut Pembongkaran', wbs_category: 'Pembongkaran' },
      ];

      const sorted = sortRabItems(items);
      expect(sorted[0].id).toBe('item-1');
      expect(sorted[1].id).toBe('item-2');
    });

    it('does not mutate the original array', () => {
      const original: SortableRabItem[] = [
        { id: 'b', description: 'B', wbsCategory: 'WBS 2' },
        { id: 'a', description: 'A', wbsCategory: 'WBS 1' },
      ];
      const copy = [...original];
      const sorted = sortRabItems(original);

      expect(sorted[0].id).toBe('a');
      expect(original).toEqual(copy);
    });
  });
});
