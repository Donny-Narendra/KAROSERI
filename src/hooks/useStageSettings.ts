import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export const DEFAULT_STAGE_NAMES: Record<string, string> = {
  '1': 'Pembongkaran',
  '2': 'Sasis/Rangka',
  '3': 'Dinding/Fabrikasi',
  '4': 'Pengecatan',
  '5': 'Kelistrikan/Hidrolik'
};

export const EXACT_ENUM_MAP: Record<string, string> = {
  'Pembongkaran': '1',
  'Sasis/Rangka': '2',
  'Dinding/Fabrikasi': '3',
  'Cat/Finishing': '4',
  'Pengecatan': '4',
  'Kelistrikan/Hidrolik': '5'
};

// In-memory cache for fast synchronous access
let cachedStageAliases: Record<string, string> = { ...DEFAULT_STAGE_NAMES };

export function getCachedStageAliases(): Record<string, string> {
  return cachedStageAliases;
}

export function setCachedStageAliases(aliases: Record<string, string>): void {
  cachedStageAliases = { ...DEFAULT_STAGE_NAMES, ...(aliases || {}) };
}

export function resolveStageIndex(
  stageValue: string | number | null | undefined,
  customAliases?: Record<string, string>
): string {
  if (!stageValue) return '1';
  const raw = String(stageValue).trim();

  // 1. Cek langsung jika input sudah berupa angka 1..5
  if (['1', '2', '3', '4', '5'].includes(raw)) return raw;

  // 2. Cek pencocokan eksak dengan Enum DB
  if (EXACT_ENUM_MAP[raw]) return EXACT_ENUM_MAP[raw];
  const foundEnum = Object.keys(EXACT_ENUM_MAP).find(k => k.toLowerCase() === raw.toLowerCase());
  if (foundEnum) return EXACT_ENUM_MAP[foundEnum];

  // 3. Cek pola eksplisit "WBS X" atau "Tahap(an) X"
  const numMatch = raw.match(/(?:wbs|tahap(?:an)?)\s*([1-5])/i);
  if (numMatch && numMatch[1]) return numMatch[1];

  // 4. Pencocokan kata kunci (Prioritaskan Cat/Finishing ke index 4)
  const s = raw.toLowerCase();
  if (s.includes('bongkar')) return '1';
  if (s.includes('sasis') || s.includes('rangka')) return '2';
  if (s.includes('dinding') || s.includes('fabrikasi') || s.includes('dempul')) return '3';
  if (s.includes('cat') || s.includes('paint') || s.includes('pengecatan') || s.includes('finishing')) return '4';
  if (s.includes('listrik') || s.includes('kelistrikan') || s.includes('hidrolik') || s.includes('wiring')) return '5';

  // 5. Cek kecocokan kustom alias jika ada
  const aliases = { ...DEFAULT_STAGE_NAMES, ...(customAliases || cachedStageAliases || {}) };
  for (const [key, alias] of Object.entries(aliases)) {
    if (alias && (s === alias.toLowerCase() || s.includes(alias.toLowerCase()))) {
      return key;
    }
  }

  return '1';
}

export function getStageDisplayName(
  stageKey: string | number | null | undefined, 
  customAliases?: Record<string, string>
): string {
  if (stageKey === null || stageKey === undefined || stageKey === '') {
    return 'Tahapan Pekerjaan';
  }

  const aliases = { ...DEFAULT_STAGE_NAMES, ...(customAliases || cachedStageAliases || {}) };
  const idx = resolveStageIndex(stageKey, aliases);

  return `Tahapan ${idx}: ${aliases[idx] || DEFAULT_STAGE_NAMES[idx] || 'Pekerjaan'}`;
}

export const STAGE_SETTINGS_EVENT = 'stage-settings-updated';

export function broadcastStageSettings(aliases: Record<string, string>): void {
  setCachedStageAliases(aliases);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STAGE_SETTINGS_EVENT, { detail: aliases }));
    try {
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('stage_settings_channel');
        bc.postMessage(aliases);
        bc.close();
      }
    } catch {
      // Ignore BroadcastChannel errors in test environments
    }
  }
}

export interface UseStageSettingsReturn {
  stageAliases: Record<string, string>;
  loading: boolean;
  error: Error | null;
  getStageDisplayName: (stageKey: string | number | null | undefined) => string;
  updateStageAliases: (newAliases: Record<string, string>) => Promise<{ error: any }>;
  resetToDefault: () => Promise<{ error: any }>;
  refresh: () => Promise<void>;
}

export function useStageSettings(): UseStageSettingsReturn {
  const [stageAliases, setStageAliases] = useState<Record<string, string>>(() => cachedStageAliases);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAliases = useCallback(async () => {
    try {
      const { data, error: fetchErr } = await supabase
        .from('workshop_settings')
        .select('stage_aliases')
        .eq('id', 1)
        .maybeSingle();

      if (fetchErr) {
        // Jangan crash jika workshop_settings belum termigrasi di sandbox, fallback ke default
        console.warn('Could not fetch stage_aliases from workshop_settings:', fetchErr.message);
        setError(new Error(fetchErr.message));
        return;
      }

      if (data && data.stage_aliases && typeof data.stage_aliases === 'object') {
        const merged = { ...DEFAULT_STAGE_NAMES, ...data.stage_aliases };
        setCachedStageAliases(merged);
        setStageAliases(merged);
      }
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAliases();

    // Listen to local window events
    const handleLocalEvent = (e: Event) => {
      const customEvent = e as CustomEvent<Record<string, string>>;
      if (customEvent.detail) {
        setStageAliases({ ...DEFAULT_STAGE_NAMES, ...customEvent.detail });
      } else {
        fetchAliases();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(STAGE_SETTINGS_EVENT, handleLocalEvent);
    }

    // Listen to cross-tab BroadcastChannel
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('stage_settings_channel');
        bc.onmessage = (event) => {
          if (event.data && typeof event.data === 'object') {
            setCachedStageAliases(event.data);
            setStageAliases({ ...DEFAULT_STAGE_NAMES, ...event.data });
          }
        };
      }
    } catch {
      // Ignore BroadcastChannel errors in jsdom
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(STAGE_SETTINGS_EVENT, handleLocalEvent);
      }
      if (bc) {
        bc.close();
      }
    };
  }, [fetchAliases]);

  const updateStageAliases = useCallback(async (newAliases: Record<string, string>) => {
    try {
      const merged = { ...DEFAULT_STAGE_NAMES, ...newAliases };
      const { error: updateErr } = await supabase
        .from('workshop_settings')
        .update({ stage_aliases: merged, updated_at: new Date().toISOString() })
        .eq('id', 1);

      if (!updateErr) {
        broadcastStageSettings(merged);
        setStageAliases(merged);
      }
      return { error: updateErr };
    } catch (err: any) {
      return { error: err };
    }
  }, []);

  const resetToDefault = useCallback(async () => {
    try {
      const { error: resetErr } = await supabase
        .from('workshop_settings')
        .update({ stage_aliases: DEFAULT_STAGE_NAMES, updated_at: new Date().toISOString() })
        .eq('id', 1);

      if (!resetErr) {
        broadcastStageSettings(DEFAULT_STAGE_NAMES);
        setStageAliases(DEFAULT_STAGE_NAMES);
      }
      return { error: resetErr };
    } catch (err: any) {
      return { error: err };
    }
  }, []);

  const resolveDisplayName = useCallback(
    (stageKey: string | number | null | undefined) => getStageDisplayName(stageKey, stageAliases),
    [stageAliases]
  );

  return {
    stageAliases,
    loading,
    error,
    getStageDisplayName: resolveDisplayName,
    updateStageAliases,
    resetToDefault,
    refresh: fetchAliases
  };
}

