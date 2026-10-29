import { describe, it, expect } from 'vitest';
import {
  getWbsWeight,
  getWbsOrderWeight,
  formatWbsBadge,
  formatTahapanBadge,
  getWbsBadgeClass,
  compareWbsAsc
} from '../wbsSort';

describe('wbsSort Utilities', () => {
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
