import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StageSettingsModal } from '../StageSettingsModal';
import { supabase } from '../../../lib/supabaseClient';
import { setCachedStageAliases, DEFAULT_STAGE_NAMES } from '../../../hooks/useStageSettings';

// Mock AuthContext
let mockRole = 'owner';
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'owner-id', full_name: 'Boss Robel', role: mockRole },
    signOut: vi.fn(),
  }),
}));

vi.mock('../../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Component: StageSettingsModal (Owner WBS Stage Customization)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRole = 'owner';
    setCachedStageAliases({ ...DEFAULT_STAGE_NAMES });

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            stage_aliases: {
              '1': 'Pembongkaran',
              '2': 'Sasis/Rangka',
              '3': 'Dinding/Fabrikasi',
              '4': 'Pengecatan',
              '5': 'Kelistrikan/Hidrolik',
            },
          },
          error: null,
        }),
      }),
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as any);
  });

  it('renders modal with 5 stage inputs when open for owner', async () => {
    render(<StageSettingsModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Pengaturan Istilah Tahapan Kerja (WBS)')).toBeInTheDocument();
    expect(screen.getByText('Tahapan 1 (Default: Pembongkaran)')).toBeInTheDocument();
    expect(screen.getByText('Tahapan 2 (Default: Sasis/Rangka)')).toBeInTheDocument();
    expect(screen.getByText('Tahapan 3 (Default: Dinding/Fabrikasi)')).toBeInTheDocument();
    expect(screen.getByText('Tahapan 4 (Default: Pengecatan)')).toBeInTheDocument();
    expect(screen.getByText('Tahapan 5 (Default: Kelistrikan/Hidrolik)')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Simpan Istilah Baru/i })).not.toBeDisabled();
    });
    expect(screen.getByRole('button', { name: /Reset Default/i })).toBeInTheDocument();
  });

  it('blocks non-owner users with warning banner', () => {
    mockRole = 'service_advisor';
    render(<StageSettingsModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Akses Terbatas')).toBeInTheDocument();
    expect(screen.getByText(/Hanya Owner yang berhak/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Simpan Istilah Baru/i })).not.toBeInTheDocument();
  });

  it('allows owner to modify stage names and save', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              stage_aliases: {
                '1': 'Pembongkaran',
                '2': 'Sasis/Rangka',
                '3': 'Dinding/Fabrikasi',
                '4': 'Pengecatan',
                '5': 'Kelistrikan/Hidrolik',
              },
            },
            error: null,
          }),
        }),
      }),
      update: mockUpdate,
    } as any);

    render(<StageSettingsModal isOpen={true} onClose={vi.fn()} />);

    // Wait for initial fetch to finish so buttons are enabled
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Simpan Istilah Baru/i })).not.toBeDisabled();
    });

    const inputs = screen.getAllByRole('textbox');
    // Input 0 = Stage 1, Input 3 = Stage 4
    fireEvent.change(inputs[0], { target: { value: 'Bongkar & Kupas Plat' } });
    fireEvent.change(inputs[3], { target: { value: 'Dempul & Cat Oven' } });

    fireEvent.click(screen.getByRole('button', { name: /Simpan Istilah Baru/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          stage_aliases: expect.objectContaining({
            '1': 'Bongkar & Kupas Plat',
            '4': 'Dempul & Cat Oven',
          }),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/berhasil disimpan/i)).toBeInTheDocument();
    });
  });

  it('resets inputs to defaults when Reset Default button is clicked', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              stage_aliases: {
                '1': 'Custom 1',
                '2': 'Custom 2',
                '3': 'Custom 3',
                '4': 'Custom 4',
                '5': 'Custom 5',
              },
            },
            error: null,
          }),
        }),
      }),
      update: mockUpdate,
    } as any);

    render(<StageSettingsModal isOpen={true} onClose={vi.fn()} />);

    // Wait for initial fetch to finish so buttons are enabled
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Reset Default/i })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /Reset Default/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          stage_aliases: expect.objectContaining({
            '1': 'Pembongkaran',
            '2': 'Sasis/Rangka',
            '3': 'Dinding/Fabrikasi',
            '4': 'Pengecatan',
            '5': 'Kelistrikan/Hidrolik',
          }),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/telah dikembalikan ke 5 istilah bawaan/i)).toBeInTheDocument();
    });
  });
});
