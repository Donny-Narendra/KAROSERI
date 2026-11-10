import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStageSettings, DEFAULT_STAGE_NAMES, getStageDisplayName, setCachedStageAliases } from '../useStageSettings';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Hook: useStageSettings & getStageDisplayName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCachedStageAliases({ ...DEFAULT_STAGE_NAMES });
  });

  it('getStageDisplayName maps enum / number to default stage titles when no custom aliases exist', () => {
    expect(getStageDisplayName('1')).toBe('Tahapan 1: Pembongkaran');
    expect(getStageDisplayName('Pembongkaran')).toBe('Tahapan 1: Pembongkaran');
    expect(getStageDisplayName('bongkar')).toBe('Tahapan 1: Pembongkaran');

    expect(getStageDisplayName('2')).toBe('Tahapan 2: Sasis/Rangka');
    expect(getStageDisplayName('Sasis/Rangka')).toBe('Tahapan 2: Sasis/Rangka');
    expect(getStageDisplayName('rangka')).toBe('Tahapan 2: Sasis/Rangka');

    expect(getStageDisplayName('3')).toBe('Tahapan 3: Dinding/Fabrikasi');
    expect(getStageDisplayName('Dinding/Fabrikasi')).toBe('Tahapan 3: Dinding/Fabrikasi');

    expect(getStageDisplayName('4')).toBe('Tahapan 4: Pengecatan');
    expect(getStageDisplayName('Cat/Finishing')).toBe('Tahapan 4: Pengecatan');
    expect(getStageDisplayName('finishing')).toBe('Tahapan 4: Pengecatan');

    expect(getStageDisplayName('5')).toBe('Tahapan 5: Kelistrikan/Hidrolik');
    expect(getStageDisplayName('Kelistrikan/Hidrolik')).toBe('Tahapan 5: Kelistrikan/Hidrolik');
    expect(getStageDisplayName('hidrolik')).toBe('Tahapan 5: Kelistrikan/Hidrolik');

    expect(getStageDisplayName(null)).toBe('Tahapan Pekerjaan');
    expect(getStageDisplayName(undefined)).toBe('Tahapan Pekerjaan');
  });

  it('getStageDisplayName maps correctly with custom aliases', () => {
    const customAliases = {
      '1': 'Bongkar & Kupas Plat',
      '2': 'Sasis & Rangka Utama',
      '3': 'Fabrikasi Bak & Bodi',
      '4': 'Dempul & Cat Oven',
      '5': 'Kelistrikan & Pompa Hidrolik',
    };

    expect(getStageDisplayName('1', customAliases)).toBe('Tahapan 1: Bongkar & Kupas Plat');
    expect(getStageDisplayName('Pembongkaran', customAliases)).toBe('Tahapan 1: Bongkar & Kupas Plat');
    expect(getStageDisplayName('Cat/Finishing', customAliases)).toBe('Tahapan 4: Dempul & Cat Oven');
    expect(getStageDisplayName('5', customAliases)).toBe('Tahapan 5: Kelistrikan & Pompa Hidrolik');
  });

  it('fetches stage_aliases from workshop_settings on mount and updates state', async () => {
    const mockAliases = {
      '1': 'Perombakan & Bodi',
      '2': 'Sasis Karoseri',
      '3': 'Fabrikasi Dinding',
      '4': 'Pengecatan Oven',
      '5': 'Sistem Hidrolik',
    };

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { stage_aliases: mockAliases },
          error: null,
        }),
      }),
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as any);

    const { result } = renderHook(() => useStageSettings());

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.stageAliases['1']).toBe('Perombakan & Bodi');
    expect(result.current.stageAliases['4']).toBe('Pengecatan Oven');
    expect(result.current.getStageDisplayName('1')).toBe('Tahapan 1: Perombakan & Bodi');
    expect(result.current.getStageDisplayName('Cat/Finishing')).toBe('Tahapan 4: Pengecatan Oven');
  });

  it('updateStageAliases saves updated aliases to workshop_settings and triggers broadcast', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { stage_aliases: DEFAULT_STAGE_NAMES },
          error: null,
        }),
      }),
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
    } as any);

    const { result } = renderHook(() => useStageSettings());

    const newAliases = {
      ...DEFAULT_STAGE_NAMES,
      '1': 'Bongkar Total',
      '4': 'Cat Spies Hecker',
    };

    await act(async () => {
      const res = await result.current.updateStageAliases(newAliases);
      expect(res.error).toBeNull();
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        stage_aliases: expect.objectContaining({
          '1': 'Bongkar Total',
          '4': 'Cat Spies Hecker',
        }),
      })
    );
    expect(result.current.stageAliases['1']).toBe('Bongkar Total');
    expect(result.current.getStageDisplayName('1')).toBe('Tahapan 1: Bongkar Total');
  });

  it('resetToDefault restores default stage names in database and state', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { stage_aliases: { '1': 'Kustom' } },
          error: null,
        }),
      }),
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
    } as any);

    const { result } = renderHook(() => useStageSettings());

    await act(async () => {
      const res = await result.current.resetToDefault();
      expect(res.error).toBeNull();
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        stage_aliases: DEFAULT_STAGE_NAMES,
      })
    );
    expect(result.current.stageAliases['1']).toBe('Pembongkaran');
  });
});
