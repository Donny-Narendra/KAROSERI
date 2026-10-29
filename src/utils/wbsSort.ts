/**
 * WBS Normalization and Ascending Sorting Utilities
 * Provides canonical ordering (Tahapan 1 -> Tahapan 2 -> Tahapan 3 -> Tahapan 4 -> Tahapan 5)
 * and badge formatting for Workshop Dashboards, Warehouse, and Service Advisor tables.
 */

export function getWbsWeight(wbs: string | number | null | undefined): number {
  if (!wbs) return 99;
  const s = String(wbs).toLowerCase().trim();
  if (!s || s === 'null' || s === 'undefined' || s === '-') return 99;
  if (s.includes('1') || s.includes('pembongkaran') || s.includes('bongkar')) return 1;
  if (s.includes('2') || s.includes('sasis') || s.includes('rangka')) return 2;
  if (s.includes('3') || s.includes('dinding') || s.includes('fabrikasi')) return 3;
  if (s.includes('4') || s.includes('cat') || s.includes('pengecatan') || s.includes('finishing')) return 4;
  if (s.includes('5') || s.includes('kelistrikan') || s.includes('hidrolik')) return 5;
  return 99;
}

export const getWbsOrderWeight = getWbsWeight;

/**
 * Mengonversi string internal WBS menjadi label ramah pengguna "Tahapan"
 * Contoh: "WBS 1: Pembongkaran" -> "Tahapan 1: Pembongkaran"
 */
export function formatTahapanBadge(rawStage: string | number | null | undefined): string {
  if (rawStage === null || rawStage === undefined || rawStage === '') return '-';
  const trimmed = String(rawStage).trim();
  if (!trimmed || trimmed === '-' || trimmed === 'null' || trimmed === 'undefined') return '-';

  // Jika sudah berformat WBS X, ganti kata WBS menjadi Tahapan
  let formatted = trimmed.replace(/\bWBS\s*(\d+)/gi, 'Tahapan $1');

  // Jika hanya berupa nama kategori tanpa nomor (contoh enum DB: 'Pembongkaran' atau angka)
  if (!/Tahapan/i.test(formatted)) {
    const s = formatted.toLowerCase();
    if (s.includes('bongkar') || s === '1') formatted = 'Tahapan 1: Pembongkaran';
    else if (s.includes('sasis') || s.includes('rangka') || s === '2') formatted = 'Tahapan 2: Sasis/Rangka';
    else if (s.includes('dinding') || s.includes('fabrikasi') || s === '3') formatted = 'Tahapan 3: Dinding/Fabrikasi';
    else if (s.includes('cat') || s.includes('finishing') || s.includes('pengecatan') || s === '4') formatted = 'Tahapan 4: Pengecatan';
    else if (s.includes('kelistrikan') || s.includes('hidrolik') || s === '5') formatted = 'Tahapan 5: Kelistrikan/Hidrolik';
  } else {
    // Normalisasi label variasi seperti "Tahapan 4: Cat/Finishing" -> "Tahapan 4: Pengecatan"
    const s = formatted.toLowerCase();
    if (s.includes('tahapan 4') && s.includes('cat/finishing')) {
      formatted = 'Tahapan 4: Pengecatan';
    }
  }

  return formatted;
}

export const formatWbsBadge = formatTahapanBadge;

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
