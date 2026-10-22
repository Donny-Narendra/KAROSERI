import { describe, it, expect } from 'vitest';
import {
  cleanPackageName,
  extractPackageFromNotes,
  resolveItemSource,
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

  describe('resolveItemSource', () => {
    it('resolves direct package_name with orange badge', () => {
      const item = { package_name: 'HPP DUDUKAN SLEBOR' };
      const res = resolveItemSource(item);
      expect(res.sourceType).toBe('PACKAGE');
      expect(res.packageName).toBe('HPP DUDUKAN SLEBOR');
      expect(res.label).toBe('📦 Paket: HPP DUDUKAN SLEBOR');
      expect(res.badgeClass).toContain('text-orange-400');
    });

    it('resolves joined product_packages.name', () => {
      const item = { product_packages: { name: 'BAK DAN FULL VARIASI' } };
      const res = resolveItemSource(item);
      expect(res.sourceType).toBe('PACKAGE');
      expect(res.packageName).toBe('BAK DAN FULL VARIASI');
      expect(res.label).toBe('📦 Paket: BAK DAN FULL VARIASI');
    });

    it('resolves nested rab_items.product_packages.name', () => {
      const item = {
        rab_items: {
          id: 'rab-1',
          product_packages: { name: 'PINTU BELAKANG LIPAT' },
        },
      };
      const res = resolveItemSource(item);
      expect(res.sourceType).toBe('PACKAGE');
      expect(res.packageName).toBe('PINTU BELAKANG LIPAT');
      expect(res.label).toBe('📦 Paket: PINTU BELAKANG LIPAT');
    });

    it('resolves package extracted from item notes', () => {
      const item = {
        notes: '[Paket: HIDROLIK DUMP TRUCK]',
      };
      const res = resolveItemSource(item);
      expect(res.sourceType).toBe('PACKAGE');
      expect(res.packageName).toBe('HIDROLIK DUMP TRUCK');
      expect(res.label).toBe('📦 Paket: HIDROLIK DUMP TRUCK');
    });

    it('resolves package from req.package_name if item has no package info', () => {
      const item = { id: 'it-1' };
      const req = { package_name: 'SUB-ASSEMBLY CANTER' };
      const res = resolveItemSource(item, req);
      expect(res.sourceType).toBe('PACKAGE');
      expect(res.packageName).toBe('SUB-ASSEMBLY CANTER');
      expect(res.label).toBe('📦 Paket: SUB-ASSEMBLY CANTER');
    });

    it('resolves Change Order with purple badge when change_order_item_id exists', () => {
      const item = { change_order_item_id: 'co-item-123' };
      const res = resolveItemSource(item);
      expect(res.sourceType).toBe('CHANGE_ORDER');
      expect(res.packageName).toBeNull();
      expect(res.label).toBe('🔄 Change Order');
      expect(res.badgeClass).toContain('text-purple-400');
    });

    it('resolves Change Order when sourceType is CHANGE_ORDER', () => {
      const item = { sourceType: 'CHANGE_ORDER' };
      const res = resolveItemSource(item);
      expect(res.sourceType).toBe('CHANGE_ORDER');
      expect(res.label).toBe('🔄 Change Order');
    });

    it('resolves Direct when is_manual is true', () => {
      const item = { is_manual: true };
      const res = resolveItemSource(item);
      expect(res.sourceType).toBe('DIRECT');
      expect(res.label).toBe('⚡ Langsung');
      expect(res.badgeClass).toContain('text-emerald-400');
    });

    it('defaults to RAB with blue badge when no other source is present', () => {
      const item = { rab_item_id: 'rab-abc-123' };
      const res = resolveItemSource(item);
      expect(res.sourceType).toBe('RAB');
      expect(res.label).toBe('📋 RAB');
      expect(res.badgeClass).toContain('text-blue-400');
    });

    it('defaults to RAB when empty object passed', () => {
      const res = resolveItemSource({});
      expect(res.sourceType).toBe('RAB');
      expect(res.label).toBe('📋 RAB');
    });
  });
});
