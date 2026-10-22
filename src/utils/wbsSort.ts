/**
 * WBS Normalization and Ascending Sorting Utilities
 * Provides canonical ordering (WBS 1 -> WBS 2 -> WBS 3 -> WBS 4 -> WBS 5)
 * and badge formatting for Warehouse and Service Advisor tables.
 */

export function getWbsWeight(wbs: string | number | null | undefined): number {
  if (!wbs) return 99;
  const s = String(wbs).toLowerCase().trim();
  if (!s || s === 'null' || s === 'undefined' || s === '-') return 99;
  if (s.includes('1') || s.includes('pembongkaran')) return 1;
  if (s.includes('2') || s.includes('sasis') || s.includes('rangka')) return 2;
  if (s.includes('3') || s.includes('dinding') || s.includes('fabrikasi')) return 3;
  if (s.includes('4') || s.includes('cat') || s.includes('pengecatan') || s.includes('finishing')) return 4;
  if (s.includes('5') || s.includes('kelistrikan') || s.includes('hidrolik')) return 5;
  return 99;
}

export const getWbsOrderWeight = getWbsWeight;

export function formatWbsBadge(wbsString: string | number | null | undefined): string {
  if (wbsString === null || wbsString === undefined || wbsString === '') return '-';
  const trimmed = String(wbsString).trim();
  if (trimmed === '-' || trimmed === 'null' || trimmed === 'undefined' || !trimmed) return '-';
  const weight = getWbsOrderWeight(wbsString);
  if (weight >= 1 && weight <= 5) {
    const titles = [
      'WBS 1: Pembongkaran',
      'WBS 2: Sasis/Rangka',
      'WBS 3: Dinding/Fabrikasi',
      'WBS 4: Pengecatan',
      'WBS 5: Kelistrikan/Hidrolik'
    ];
    return titles[weight - 1];
  }
  return trimmed;
}

export function getWbsBadgeClass(wbsString: string | null | undefined): string {
  const weight = getWbsOrderWeight(wbsString);
  switch (weight) {
    case 1:
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
    case 2:
      return 'bg-blue-500/10 text-blue-400 border border-blue-500/30';
    case 3:
      return 'bg-purple-500/10 text-purple-400 border border-purple-500/30';
    case 4:
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
    case 5:
      return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30';
    default:
      return 'bg-surface-hover text-text-muted border border-border';
  }
}

export function compareWbsAsc(aWbs?: string | null, bWbs?: string | null): number {
  const weightA = getWbsOrderWeight(aWbs);
  const weightB = getWbsOrderWeight(bWbs);
  if (weightA !== weightB) {
    return weightA - weightB;
  }
  return (aWbs || '').localeCompare(bWbs || '');
}
