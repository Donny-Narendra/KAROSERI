import { 
  DEFAULT_STAGE_NAMES, 
  getCachedStageAliases, 
  EXACT_ENUM_MAP, 
  resolveStageIndex 
} from '../hooks/useStageSettings';

export { EXACT_ENUM_MAP, resolveStageIndex };

/**
 * WBS Normalization and Ascending Sorting Utilities
 * Provides canonical ordering (Tahapan 1 -> Tahapan 2 -> Tahapan 3 -> Tahapan 4 -> Tahapan 5)
 * and dynamic badge formatting for Workshop Dashboards, Warehouse, and Service Advisor tables.
 */

export function getWbsWeight(wbs: string | number | null | undefined, customAliases?: Record<string, string>): number {
  if (wbs === null || wbs === undefined || wbs === '') return 99;
  const raw = String(wbs).trim();
  if (!raw || raw === 'null' || raw === 'undefined' || raw === '-') return 99;

  // 1. Cek langsung jika input sudah berupa angka 1..5
  if (['1', '2', '3', '4', '5'].includes(raw)) return Number(raw);

  // 2. Cek pencocokan eksak dengan Enum DB
  if (EXACT_ENUM_MAP[raw]) return Number(EXACT_ENUM_MAP[raw]);
  const foundEnum = Object.keys(EXACT_ENUM_MAP).find(k => k.toLowerCase() === raw.toLowerCase());
  if (foundEnum) return Number(EXACT_ENUM_MAP[foundEnum]);

  // 3. Cek pola eksplisit "WBS X" atau "Tahap(an) X"
  const numMatch = raw.match(/(?:wbs|tahap(?:an)?)\s*([1-5])/i);
  if (numMatch && numMatch[1]) return Number(numMatch[1]);

  // 4. Pencocokan kata kunci (Prioritaskan Cat/Finishing ke index 4)
  const s = raw.toLowerCase();
  if (s.includes('bongkar')) return 1;
  if (s.includes('sasis') || s.includes('rangka')) return 2;
  if (s.includes('dinding') || s.includes('fabrikasi') || s.includes('dempul')) return 3;
  if (s.includes('cat') || s.includes('paint') || s.includes('pengecatan') || s.includes('finishing')) return 4;
  if (s.includes('listrik') || s.includes('kelistrikan') || s.includes('hidrolik') || s.includes('wiring')) return 5;

  // 5. Cek kecocokan kustom alias jika ada
  const aliases = { ...DEFAULT_STAGE_NAMES, ...(customAliases || getCachedStageAliases() || {}) };
  for (const [key, alias] of Object.entries(aliases)) {
    if (alias && (s === alias.toLowerCase() || s.includes(alias.toLowerCase()))) {
      return Number(key);
    }
  }

  return 99;
}

export const getWbsOrderWeight = getWbsWeight;

/**
 * Mengonversi string internal WBS menjadi label ramah pengguna "Tahapan"
 * Contoh: "WBS 1: Pembongkaran" -> "Tahapan 1: Pembongkaran" (atau alias dinamis dari workshop_settings)
 */
export function formatTahapanBadge(
  rawStage: string | number | null | undefined,
  customAliases?: Record<string, string>
): string {
  if (rawStage === null || rawStage === undefined || rawStage === '') return '-';
  const trimmed = String(rawStage).trim();
  if (!trimmed || trimmed === '-' || trimmed === 'null' || trimmed === 'undefined') return '-';

  const weight = getWbsWeight(trimmed, customAliases);
  if (weight >= 1 && weight <= 5) {
    const aliases = { ...DEFAULT_STAGE_NAMES, ...(customAliases || getCachedStageAliases() || {}) };
    const idx = String(weight);
    return `Tahapan ${idx}: ${aliases[idx] || DEFAULT_STAGE_NAMES[idx]}`;
  }

  return trimmed;
}

export const formatWbsBadge = formatTahapanBadge;

export function getWbsBadgeClass(wbsString: string | null | undefined, customAliases?: Record<string, string>): string {
  const weight = getWbsOrderWeight(wbsString, customAliases);
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

export function compareWbsAsc(aWbs?: string | null, bWbs?: string | null, customAliases?: Record<string, string>): number {
  const weightA = getWbsOrderWeight(aWbs, customAliases);
  const weightB = getWbsOrderWeight(bWbs, customAliases);
  if (weightA !== weightB) {
    return weightA - weightB;
  }
  return (aWbs || '').localeCompare(bWbs || '');
}
