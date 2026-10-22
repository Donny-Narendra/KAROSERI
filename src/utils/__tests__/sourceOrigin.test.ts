import { describe, it, expect } from 'vitest';
import {
  cleanPackageName,
  extractPackageFromNotes,
  resolveDetailedSource,
  resolveItemSource,
  extractIssueSource,
} from '../sourceOrigin';

describe('sourceOrigin utility', () => {
  describe('cleanPackageName', () => {
    it('returns null for empty or non-string inputs', () => {
      expect(cleanPackageName(null)).toBeNull();
      expect(cleanPackageName(undefined)).toBeNull();
      expect(cleanPackageName('')).toBeNull();
      expect(cleanPackageName('   ')).toBeNull();
    });

    it('cleans plain package names', () => {
      expect(cleanPackageName('HPP DUDUKAN SLEBOR')).toBe('HPP DUDUKAN SLEBOR');
    });

    it('strips [Paket: ...] wrapper', () => {
      expect(cleanPackageName('[Paket: HPP DUDUKAN SLEBOR]')).toBe('HPP DUDUKAN SLEBOR');
      expect(cleanPackageName('Paket: BAK DAN FULL VARIASI')).toBe('BAK DAN FULL VARIASI');
    });
  });

  describe('extractPackageFromNotes', () => {
    it('extracts package name from [Paket: XYZ] notes', () => {
      expect(extractPackageFromNotes('[Paket: HPP DUDUKAN SLEBOR]')).toBe('HPP DUDUKAN SLEBOR');
      expect(extractPackageFromNotes('Keterangan item [Paket: DUDUKAN TANGKI] tambahan')).toBe('DUDUKAN TANGKI');
    });

    it('returns null if note does not specify a package', () => {
      expect(extractPackageFromNotes('Tambahan baut 10mm')).toBeNull();
      expect(extractPackageFromNotes(null)).toBeNull();
    });
  });

  describe('resolveDetailedSource', () => {
    it('resolves RAB with package name and returns amber badge', () => {
      const item = { package_name: 'SLEBOR BELAKANG' };
      const res = resolveDetailedSource(item);
      expect(res.origin).toBe('RAB');
      expect(res.typeLabel).toBe('Paket: SLEBOR BELAKANG');
      expect(res.fullLabel).toBe('RAB • Paket: SLEBOR BELAKANG');
      expect(res.badgeClass).toBe('bg-amber-950/70 text-amber-300 border border-amber-600/50');
    });

    it('cleans duplicate Paket: prefix if already present in package_name', () => {
      const item = { package_name: 'Paket: SLEBOR BELAKANG' };
      const res = resolveDetailedSource(item);
      expect(res.origin).toBe('RAB');
      expect(res.typeLabel).toBe('Paket: SLEBOR BELAKANG');
      expect(res.fullLabel).toBe('RAB • Paket: SLEBOR BELAKANG');
    });

    it('resolves Change Order with package name and returns purple badge', () => {
      const item = {
        change_order_id: 'co-123',
        product_packages: { name: 'DUDUKAN LAMPU' },
      };
      const res = resolveDetailedSource(item);
      expect(res.origin).toBe('Change Order');
      expect(res.typeLabel).toBe('Paket: DUDUKAN LAMPU');
      expect(res.fullLabel).toBe('Change Order • Paket: DUDUKAN LAMPU');
      expect(res.badgeClass).toBe('bg-purple-950/70 text-purple-300 border border-purple-600/50');
    });

    it('resolves Change Order from source_type === "CHANGE_ORDER"', () => {
      const item = {
        source_type: 'CHANGE_ORDER',
        package_name: 'BAK DUMP TRUCK',
      };
      const res = resolveDetailedSource(item);
      expect(res.origin).toBe('Change Order');
      expect(res.fullLabel).toBe('Change Order • Paket: BAK DUMP TRUCK');
    });

    it('resolves Change Order from req.is_change_order or req.change_order_id', () => {
      const item = { package_name: 'KABIN DEPAN' };
      const req = { is_change_order: true };
      const res = resolveDetailedSource(item, req);
      expect(res.origin).toBe('Change Order');
      expect(res.fullLabel).toBe('Change Order • Paket: KABIN DEPAN');
    });

    it('resolves RAB Granular fallback when no package is attached', () => {
      const item = { material_id: 'mat-1', quantity: 10 };
      const res = resolveDetailedSource(item);
      expect(res.origin).toBe('RAB');
      expect(res.typeLabel).toBe('Granular');
      expect(res.fullLabel).toBe('RAB • Granular');
      expect(res.badgeClass).toBe('bg-blue-950/70 text-blue-300 border border-blue-600/50');
    });

    it('resolves Change Order Granular fallback when no package is attached', () => {
      const item = {
        change_order_id: 'co-456',
        material_name: 'Pipa Seamless 2 inch',
      };
      const res = resolveDetailedSource(item);
      expect(res.origin).toBe('Change Order');
      expect(res.typeLabel).toBe('Granular');
      expect(res.fullLabel).toBe('Change Order • Granular');
      expect(res.badgeClass).toBe('bg-indigo-950/70 text-indigo-300 border border-indigo-600/50');
    });

    it('resolves package from notes if field package_name is absent', () => {
      const item = { notes: '[Paket: HIDROLIK DUMP]' };
      const res = resolveDetailedSource(item);
      expect(res.origin).toBe('RAB');
      expect(res.typeLabel).toBe('Paket: HIDROLIK DUMP');
      expect(res.fullLabel).toBe('RAB • Paket: HIDROLIK DUMP');
    });

    it('resolves package from req.package_name if item has no package info', () => {
      const item = { id: 'it-1' };
      const req = { package_name: 'SUB-ASSEMBLY CANTER' };
      const res = resolveDetailedSource(item, req);
      expect(res.origin).toBe('RAB');
      expect(res.typeLabel).toBe('Paket: SUB-ASSEMBLY CANTER');
      expect(res.fullLabel).toBe('RAB • Paket: SUB-ASSEMBLY CANTER');
    });
  });

  describe('resolveItemSource compatibility wrapper', () => {
    it('provides label identical to fullLabel with appropriate sourceType', () => {
      const item = { package_name: 'PINTU BELAKANG' };
      const res = resolveItemSource(item);
      expect(res.label).toBe('RAB • Paket: PINTU BELAKANG');
      expect(res.fullLabel).toBe('RAB • Paket: PINTU BELAKANG');
      expect(res.sourceType).toBe('PACKAGE');
      expect(res.packageName).toBe('PINTU BELAKANG');
      expect(res.origin).toBe('RAB');
    });

    it('provides label for Granular items with appropriate sourceType', () => {
      const item = { id: 'it-loose' };
      const res = resolveItemSource(item);
      expect(res.label).toBe('RAB • Granular');
      expect(res.fullLabel).toBe('RAB • Granular');
      expect(res.sourceType).toBe('RAB');
      expect(res.packageName).toBeNull();
      expect(res.typeLabel).toBe('Granular');
    });

    it('handles empty or null item gracefully', () => {
      const res = resolveItemSource(null);
      expect(res.origin).toBe('RAB');
      expect(res.typeLabel).toBe('Granular');
      expect(res.label).toBe('RAB • Granular');
      expect(res.fullLabel).toBe('RAB • Granular');
    });
  });

  describe('extractIssueSource', () => {
    it('extracts source from issue with nested requisition items', () => {
      const issue = {
        material_requisition_items: [
          {
            change_order_id: 'co-issue-9',
            package_name: 'TANGKI SOLAR',
          },
        ],
      };
      const res = extractIssueSource(issue);
      expect(res.origin).toBe('Change Order');
      expect(res.typeLabel).toBe('Paket: TANGKI SOLAR');
      expect(res.fullLabel).toBe('Change Order • Paket: TANGKI SOLAR');
      expect(res.badgeClass).toBe('bg-purple-950/70 text-purple-300 border border-purple-600/50');
    });

    it('extracts Granular source from issue without package', () => {
      const issue = {
        material_requisition_items: {
          wbs_stage: 'WBS 1: Pembongkaran',
        },
      };
      const res = extractIssueSource(issue);
      expect(res.origin).toBe('RAB');
      expect(res.typeLabel).toBe('Granular');
      expect(res.fullLabel).toBe('RAB • Granular');
      expect(res.badgeClass).toBe('bg-blue-950/70 text-blue-300 border border-blue-600/50');
    });
  });
});
