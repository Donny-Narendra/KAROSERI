/**
 * WBS Normalization and Ascending Sorting Utilities
 * Provides canonical ordering (WBS 1 -> WBS 2 -> WBS 3 -> WBS 4 -> WBS 5)
 * and badge formatting for Warehouse and Service Advisor tables.
 */

export function getWbsOrderWeight(wbsString: string | null | undefined): number {
  if (!wbsString) return 99;
  const str = wbsString.toLowerCase();
  if (str.includes('1') || str.includes('pembongkaran')) return 1;
  if (str.includes('2') || str.includes('sasis') || str.includes('rangka')) return 2;
  if (str.includes('3') || str.includes('dinding') || str.includes('fabrikasi')) return 3;
  if (str.includes('4') || str.includes('cat') || str.includes('pengecatan') || str.includes('finishing')) return 4;
  if (str.includes('5') || str.includes('kelistrikan') || str.includes('hidrolik')) return 5;
  return 99;
}

export function formatWbsBadge(wbsString: string | null | undefined): string {
  if (!wbsString) return '-';
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
  return wbsString;
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
