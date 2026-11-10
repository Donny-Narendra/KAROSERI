import { describe, it, expect } from 'vitest';
import {
  getWbsWeight,
  getWbsOrderWeight,
  formatWbsBadge,
  formatTahapanBadge,
  getWbsBadgeClass,
  compareWbsAsc,
  resolveStageIndex,
  EXACT_ENUM_MAP
} from '../wbsSort';

describe('wbsSort Utilities', () => {
  describe('resolveStageIndex and EXACT_ENUM_MAP', () => {
    it('maps enum values, numbers, and keywords deterministically without collision', () => {
      expect(EXACT_ENUM_MAP['Cat/Finishing']).toBe('4');
      expect(EXACT_ENUM_MAP['Pembongkaran']).toBe('1');
      expect(EXACT_ENUM_MAP['Sasis/Rangka']).toBe('2');
      expect(EXACT_ENUM_MAP['Dinding/Fabrikasi']).toBe('3');
      expect(EXACT_ENUM_MAP['Pengecatan']).toBe('4');
      expect(EXACT_ENUM_MAP['Kelistrikan/Hidrolik']).toBe('5');

      expect(resolveStageIndex('1')).toBe('1');
      expect(resolveStageIndex('2')).toBe('2');
      expect(resolveStageIndex('3')).toBe('3');
      expect(resolveStageIndex('4')).toBe('4');
      expect(resolveStageIndex('5')).toBe('5');

      expect(resolveStageIndex('Pembongkaran')).toBe('1');
      expect(resolveStageIndex('Sasis/Rangka')).toBe('2');
      expect(resolveStageIndex('Dinding/Fabrikasi')).toBe('3');
      expect(resolveStageIndex('Cat/Finishing')).toBe('4');
      expect(resolveStageIndex('cat/finishing')).toBe('4');
      expect(resolveStageIndex('Kelistrikan/Hidrolik')).toBe('5');

      expect(resolveStageIndex('WBS 1')).toBe('1');
      expect(resolveStageIndex('Tahap 4')).toBe('4');
      expect(resolveStageIndex('Tahapan 5: Finishing')).toBe('5');

      expect(resolveStageIndex('bongkar')).toBe('1');
      expect(resolveStageIndex('sasis')).toBe('2');
      expect(resolveStageIndex('dempul')).toBe('3');
      expect(resolveStageIndex('finishing')).toBe('4');
      expect(resolveStageIndex('wiring')).toBe('5');

      expect(resolveStageIndex(null)).toBe('1');
      expect(resolveStageIndex(undefined)).toBe('1');
      expect(resolveStageIndex('')).toBe('1');
      expect(resolveStageIndex('unknown-stage')).toBe('1');
    });

    it('prevents collision when stage 5 alias is Finishing and restores stage 4', () => {
      const collisionAliases = {
        '1': 'Pembongkaran',
        '2': 'Sasis/Rangka',
        '3': 'Pendempulan',
        '4': 'Pengecatan',
        '5': 'Finishing'
      };

      // Cat/Finishing must strictly resolve to index 4, NOT 5
      expect(resolveStageIndex('Cat/Finishing', collisionAliases)).toBe('4');
      expect(getWbsWeight('Cat/Finishing', collisionAliases)).toBe(4);
      expect(formatTahapanBadge('Cat/Finishing', collisionAliases)).toBe('Tahapan 4: Pengecatan');

      // Stage 5 must resolve to 5
      expect(resolveStageIndex('Kelistrikan/Hidrolik', collisionAliases)).toBe('5');
      expect(getWbsWeight('Kelistrikan/Hidrolik', collisionAliases)).toBe(5);
      expect(formatTahapanBadge('Kelistrikan/Hidrolik', collisionAliases)).toBe('Tahapan 5: Finishing');

      // Sorting the 5 stages produces 1, 2, 3, 4, 5 without duplicates
      const stages = ['Kelistrikan/Hidrolik', 'Cat/Finishing', 'Dinding/Fabrikasi', 'Pembongkaran', 'Sasis/Rangka'];
      stages.sort((a, b) => Number(resolveStageIndex(a, collisionAliases)) - Number(resolveStageIndex(b, collisionAliases)));
      expect(stages).toEqual([
        'Pembongkaran',
        'Sasis/Rangka',
        'Dinding/Fabrikasi',
        'Cat/Finishing',
        'Kelistrikan/Hidrolik'
      ]);
    });
  });
  describe('getWbsWeight and getWbsOrderWeight', () => {
    it('correctly maps WBS stages 1 through 5 by number or keyword', () => {
      // Stage 1
      expect(getWbsWeight('WBS 1: Pembongkaran')).toBe(1);
      expect(getWbsWeight('Tahapan 1: Pembongkaran')).toBe(1);
      expect(getWbsWeight('Pembongkaran')).toBe(1);
      expect(getWbsWeight('wbs 1')).toBe(1);
      expect(getWbsOrderWeight('WBS 1: Pembongkaran')).toBe(1);

      // Stage 2
      expect(getWbsOrderWeight('WBS 2: Sasis/Rangka')).toBe(2);
      expect(getWbsOrderWeight('Tahapan 2: Sasis/Rangka')).toBe(2);
      expect(getWbsOrderWeight('Sasis/Rangka')).toBe(2);
      expect(getWbsOrderWeight('Rangka')).toBe(2);
      expect(getWbsOrderWeight('wbs 2')).toBe(2);

      // Stage 3
      expect(getWbsOrderWeight('WBS 3: Dinding/Fabrikasi')).toBe(3);
      expect(getWbsOrderWeight('Tahapan 3: Dinding/Fabrikasi')).toBe(3);
      expect(getWbsOrderWeight('Dinding/Fabrikasi')).toBe(3);
      expect(getWbsOrderWeight('Fabrikasi Plat')).toBe(3);
      expect(getWbsOrderWeight('wbs 3')).toBe(3);

      // Stage 4
      expect(getWbsOrderWeight('WBS 4: Pengecatan')).toBe(4);
      expect(getWbsOrderWeight('Tahapan 4: Pengecatan')).toBe(4);
      expect(getWbsOrderWeight('Cat/Finishing')).toBe(4);
      expect(getWbsOrderWeight('Pengecatan')).toBe(4);
      expect(getWbsOrderWeight('Cat Epoxy')).toBe(4);
      expect(getWbsOrderWeight('wbs 4')).toBe(4);

      // Stage 5
      expect(getWbsOrderWeight('WBS 5: Kelistrikan/Hidrolik')).toBe(5);
      expect(getWbsOrderWeight('Tahapan 5: Kelistrikan/Hidrolik')).toBe(5);
      expect(getWbsOrderWeight('Kelistrikan')).toBe(5);
      expect(getWbsOrderWeight('Hidrolik Dump')).toBe(5);
      expect(getWbsOrderWeight('wbs 5')).toBe(5);
    });

    it('returns 99 for null, undefined, empty, or unmapped strings', () => {
      expect(getWbsOrderWeight(null)).toBe(99);
      expect(getWbsOrderWeight(undefined)).toBe(99);
      expect(getWbsOrderWeight('')).toBe(99);
      expect(getWbsOrderWeight('General Maintenance')).toBe(99);
    });
  });

  describe('formatTahapanBadge and formatWbsBadge', () => {
    it('formats recognized WBS strings into canonical Tahapan titles', () => {
      expect(formatTahapanBadge('Pembongkaran')).toBe('Tahapan 1: Pembongkaran');
      expect(formatTahapanBadge('WBS 1: Pembongkaran')).toBe('Tahapan 1: Pembongkaran');
      expect(formatTahapanBadge('sasis')).toBe('Tahapan 2: Sasis/Rangka');
      expect(formatTahapanBadge('WBS 2: Sasis/Rangka')).toBe('Tahapan 2: Sasis/Rangka');
      expect(formatTahapanBadge('dinding')).toBe('Tahapan 3: Dinding/Fabrikasi');
      expect(formatTahapanBadge('cat')).toBe('Tahapan 4: Pengecatan');
      expect(formatTahapanBadge('Cat/Finishing')).toBe('Tahapan 4: Pengecatan');
      expect(formatTahapanBadge('WBS 4: Cat/Finishing')).toBe('Tahapan 4: Pengecatan');
      expect(formatTahapanBadge('kelistrikan')).toBe('Tahapan 5: Kelistrikan/Hidrolik');
    });

    it('formats via formatWbsBadge with same canonical Tahapan output', () => {
      expect(formatWbsBadge('Pembongkaran')).toBe('Tahapan 1: Pembongkaran');
      expect(formatWbsBadge('sasis')).toBe('Tahapan 2: Sasis/Rangka');
      expect(formatWbsBadge('dinding')).toBe('Tahapan 3: Dinding/Fabrikasi');
      expect(formatWbsBadge('cat')).toBe('Tahapan 4: Pengecatan');
      expect(formatWbsBadge('kelistrikan')).toBe('Tahapan 5: Kelistrikan/Hidrolik');
    });

    it('handles fallback cases for unmapped or falsy values', () => {
      expect(formatTahapanBadge(null)).toBe('-');
      expect(formatTahapanBadge(undefined)).toBe('-');
      expect(formatTahapanBadge('')).toBe('-');
      expect(formatTahapanBadge('Custom Stage')).toBe('Custom Stage');
    });

    it('formats WBS strings with custom stage aliases dynamically', () => {
      const customAliases = {
        '1': 'Bongkar & Kupas Plat',
        '2': 'Sasis & Rangka Utama',
        '3': 'Fabrikasi Bak & Dinding',
        '4': 'Dempul & Cat Oven',
        '5': 'Kelistrikan & Sistem Hidrolik'
      };

      expect(formatTahapanBadge('Pembongkaran', customAliases)).toBe('Tahapan 1: Bongkar & Kupas Plat');
      expect(formatTahapanBadge('WBS 1: Pembongkaran', customAliases)).toBe('Tahapan 1: Bongkar & Kupas Plat');
      expect(formatTahapanBadge('sasis', customAliases)).toBe('Tahapan 2: Sasis & Rangka Utama');
      expect(formatTahapanBadge('dinding', customAliases)).toBe('Tahapan 3: Fabrikasi Bak & Dinding');
      expect(formatTahapanBadge('Cat/Finishing', customAliases)).toBe('Tahapan 4: Dempul & Cat Oven');
      expect(formatTahapanBadge('kelistrikan', customAliases)).toBe('Tahapan 5: Kelistrikan & Sistem Hidrolik');
    });
  });

  describe('getWbsBadgeClass', () => {
    it('returns distinctive styles for stages 1 to 5', () => {
      expect(getWbsBadgeClass('wbs 1')).toContain('text-amber-400');
      expect(getWbsBadgeClass('wbs 2')).toContain('text-blue-400');
      expect(getWbsBadgeClass('wbs 3')).toContain('text-purple-400');
      expect(getWbsBadgeClass('wbs 4')).toContain('text-emerald-400');
      expect(getWbsBadgeClass('wbs 5')).toContain('text-cyan-400');
      expect(getWbsBadgeClass('unknown')).toContain('border-border');
    });
  });

  describe('compareWbsAsc', () => {
    it('sorts WBS stages strictly in ascending sequence', () => {
      const stages = [
        'WBS 5: Kelistrikan/Hidrolik',
        'WBS 2: Sasis/Rangka',
        'Pembongkaran',
        'Cat/Finishing',
        'Dinding/Fabrikasi'
      ];

      const sorted = [...stages].sort(compareWbsAsc);
      expect(sorted).toEqual([
        'Pembongkaran', // weight 1
        'WBS 2: Sasis/Rangka', // weight 2
        'Dinding/Fabrikasi', // weight 3
        'Cat/Finishing', // weight 4
        'WBS 5: Kelistrikan/Hidrolik' // weight 5
      ]);
    });

    it('places unknown or null WBS items at the end', () => {
      const mixed = ['WBS 2: Sasis/Rangka', null, 'Pembongkaran', undefined, 'Other'];
      const sorted = [...mixed].sort(compareWbsAsc);
      expect(sorted[0]).toBe('Pembongkaran');
      expect(sorted[1]).toBe('WBS 2: Sasis/Rangka');
      expect(sorted.slice(2)).toContain('Other');
    });
  });
});
