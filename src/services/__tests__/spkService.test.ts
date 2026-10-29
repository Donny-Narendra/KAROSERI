import { describe, it, expect, vi, beforeEach } from 'vitest';
import { spkService } from '../spkService';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('spkService.updateAgreementPhotos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws an error if spkNo is empty', async () => {
    await expect(spkService.updateAgreementPhotos('', [])).rejects.toThrow('SPK Number is required');
  });

  it('updates agreement_photos in supabase and returns the record', async () => {
    const mockPhotos = [
      {
        url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        secure_url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        public_id: 'karoseriops/spk_agreements/sample',
      },
    ];

    const singleMock = vi.fn().mockResolvedValue({
      data: { spk_no: 'SPK-2026-001', agreement_photos: mockPhotos },
      error: null,
    });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const eqMock = vi.fn().mockReturnValue({ select: selectMock });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });

    vi.mocked(supabase.from).mockReturnValue({
      update: updateMock,
    } as any);

    const result = await spkService.updateAgreementPhotos('SPK-2026-001', mockPhotos);

    expect(supabase.from).toHaveBeenCalledWith('spk');
    expect(updateMock).toHaveBeenCalledWith({ agreement_photos: mockPhotos });
    expect(eqMock).toHaveBeenCalledWith('spk_no', 'SPK-2026-001');
    expect(result).toEqual({ spk_no: 'SPK-2026-001', agreement_photos: mockPhotos });
  });

  it('throws error if supabase returns an error', async () => {
    const singleMock = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Database connection failed' },
    });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const eqMock = vi.fn().mockReturnValue({ select: selectMock });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });

    vi.mocked(supabase.from).mockReturnValue({
      update: updateMock,
    } as any);

    await expect(spkService.updateAgreementPhotos('SPK-2026-001', [])).rejects.toThrow(
      'Failed to update agreement photos: Database connection failed'
    );
  });
});

