/**
 * Centralized Sorting Utility for RAB Items
 * Enforces identical ordering between UI Table and Excel / PDF exports:
 * 1. Primary: Ascending WBS Stage (WBS 1 -> WBS 2 -> WBS 3 -> WBS 4 -> WBS 5 -> Other)
 * 2. Secondary: Origin Source (Assembly Packages first, then Granular items)
 * 3. Tertiary: Alphabetical item description / material name (A-Z)
 */

export function getWbsWeight(wbs: string | null | undefined): number {
  if (!wbs) return 99;
  const s = wbs.toLowerCase();
  if (s.includes('1') || s.includes('pembongkaran')) return 1;
  if (s.includes('2') || s.includes('sasis') || s.includes('rangka')) return 2;
  if (s.includes('3') || s.includes('dinding') || s.includes('fabrikasi')) return 3;
  if (s.includes('4') || s.includes('cat') || s.includes('pengecatan') || s.includes('finishing')) return 4;
  if (s.includes('5') || s.includes('kelistrikan') || s.includes('hidrolik')) return 5;
  return 99;
}

export interface SortableRabItem {
  description?: string | null;
  material_name?: string | null;
  name?: string | null;
  package_id?: string | null;
  packageId?: string | null;
  package_name?: string | null;
  packageName?: string | null;
  notes?: string | null;
  wbs_stage?: string | null;
  wbs_category?: string | null;
  wbsCategory?: string | null;
  [key: string]: any;
}

export function isItemFromPackage(item: SortableRabItem): boolean {
  if (item.package_id || item.packageId || item.package_name || item.packageName) {
    return true;
  }
  if (item.notes) {
    const lowerNotes = item.notes.toLowerCase();
    if (lowerNotes.includes('paket:') || lowerNotes.includes('bagian dari paket:')) {
      return true;
    }
  }
  return false;
}

export function sortRabItems<T extends SortableRabItem>(items: T[]): T[] {
  if (!items || !Array.isArray(items)) return [];

  return [...items].sort((a, b) => {
    // 1. Primary: WBS stage ascending
    const wbsA = getWbsWeight(a.wbs_stage || a.wbs_category || a.wbsCategory);
    const wbsB = getWbsWeight(b.wbs_stage || b.wbs_category || b.wbsCategory);
    if (wbsA !== wbsB) {
      return wbsA - wbsB;
    }

    // 2. Secondary: Paket lebih dulu daripada Granular
    const isPkgA = isItemFromPackage(a);
    const isPkgB = isItemFromPackage(b);
    if (isPkgA !== isPkgB) {
      return isPkgA ? -1 : 1;
    }

    // 3. Tertiary: Nama item alfabetis
    const nameA = (a.description || a.material_name || a.name || '').trim().toLowerCase();
    const nameB = (b.description || b.material_name || b.name || '').trim().toLowerCase();
    return nameA.localeCompare(nameB, 'id-ID', { sensitivity: 'base' });
  });
}
