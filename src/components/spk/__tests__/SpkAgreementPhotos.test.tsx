import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SpkAgreementPhotos } from '../SpkAgreementPhotos';
import { spkService } from '../../../services/spkService';
import * as cloudinaryUtils from '../../../utils/cloudinary';
import type { Spk } from '../../../types/spk';

vi.mock('../../../services/spkService', () => ({
  spkService: {
    updateAgreementPhotos: vi.fn(),
  },
}));

describe('Component: SpkAgreementPhotos', () => {
  const mockSpk: Spk = {
    id: 'spk-test-1',
    spk_no: 'SPK-2026-0099',
    customer_name: 'PT Karoseri Handal',
    vehicle_number: 'B 1111 AAA',
    vehicle_plate: 'B 1111 AAA',
    status: 'ACTIVE',
    created_at: '2026-10-29T10:00:00Z',
    agreement_photos: [
      {
        url: 'https://res.cloudinary.com/demo/image/upload/v1/karoseriops/spk_agreements/SPK-2026-0099_1.jpg',
        secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/karoseriops/spk_agreements/SPK-2026-0099_1.jpg',
        public_id: 'karoseriops/spk_agreements/SPK-2026-0099_1',
        bytes: 120000,
        format: 'jpg',
        uploaded_at: '2026-10-29T10:30:00Z',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title, counter, and thumbnail gallery using w_300 Cloudinary transform', () => {
    render(<SpkAgreementPhotos spk={mockSpk} onUpdated={vi.fn()} />);

    expect(screen.getByText('Dokumentasi Surat Kesepakatan Kerja')).toBeInTheDocument();
    expect(screen.getByText('1 Berkas')).toBeInTheDocument();

    const img = screen.getByAltText('Surat Kesepakatan 1') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toContain('c_limit,w_300');
    expect(img.src).toContain('f_auto,q_auto');
  });

  it('renders empty placeholder message when no photos exist', () => {
    const spkWithoutPhotos: Spk = { ...mockSpk, agreement_photos: [] };
    render(<SpkAgreementPhotos spk={spkWithoutPhotos} onUpdated={vi.fn()} />);

    expect(screen.getByText(/Belum ada foto surat kesepakatan kerja/i)).toBeInTheDocument();
  });

  it('opens Fullscreen Lightbox Modal (w_1600) when clicking a thumbnail', () => {
    render(<SpkAgreementPhotos spk={mockSpk} onUpdated={vi.fn()} />);

    const img = screen.getByAltText('Surat Kesepakatan 1');
    fireEvent.click(img);

    expect(screen.getByText(/Pratinjau Surat Kesepakatan Kerja: SPK-2026-0099/i)).toBeInTheDocument();
    const previewImg = screen.getByAltText('Pratinjau Penuh Surat Kesepakatan') as HTMLImageElement;
    expect(previewImg.src).toContain('c_limit,w_1600');
    expect(previewImg.src).toContain('f_auto,q_auto');

    // Close preview
    const closeBtn = screen.getByTitle('Tutup');
    fireEvent.click(closeBtn);
    expect(screen.queryByText(/Pratinjau Surat Kesepakatan Kerja:/i)).not.toBeInTheDocument();
  });

  it('handles direct client-to-Cloudinary upload and updates SPK agreement_photos', async () => {
    const uploadSpy = vi.spyOn(cloudinaryUtils, 'uploadToCloudinary').mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/karoseriops/spk_agreements/SPK-2026-0099_new.jpg',
      public_id: 'karoseriops/spk_agreements/SPK-2026-0099_new',
      format: 'jpg',
      bytes: 250000,
    });
    vi.mocked(spkService.updateAgreementPhotos).mockResolvedValue({} as any);
    const onUpdatedMock = vi.fn();

    render(<SpkAgreementPhotos spk={mockSpk} onUpdated={onUpdatedMock} />);

    const fileInput = screen.getByTestId('agreement-photo-input');
    const testFile = new File(['test-content'], 'agreement_signed.jpg', { type: 'image/jpeg' });

    fireEvent.change(fileInput, { target: { files: [testFile] } });

    await waitFor(() => {
      expect(uploadSpy).toHaveBeenCalledTimes(1);
    });

    expect(uploadSpy).toHaveBeenCalledWith(
      testFile,
      'karoseriops/spk_agreements',
      expect.stringContaining('SPK-2026-0099_')
    );

    expect(spkService.updateAgreementPhotos).toHaveBeenCalledWith(
      'SPK-2026-0099',
      expect.arrayContaining([
        expect.objectContaining({
          public_id: 'karoseriops/spk_agreements/SPK-2026-0099_1',
        }),
        expect.objectContaining({
          public_id: 'karoseriops/spk_agreements/SPK-2026-0099_new',
          secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/karoseriops/spk_agreements/SPK-2026-0099_new.jpg',
        }),
      ])
    );

    expect(onUpdatedMock).toHaveBeenCalledTimes(1);
  });

  it('confirms and deletes photo via ConfirmationModal', async () => {
    vi.mocked(spkService.updateAgreementPhotos).mockResolvedValue({} as any);
    const onUpdatedMock = vi.fn();

    render(<SpkAgreementPhotos spk={mockSpk} onUpdated={onUpdatedMock} />);

    const deleteBtn = screen.getByTestId('delete-photo-0');
    fireEvent.click(deleteBtn);

    // Confirmation modal should be visible
    expect(screen.getByText('Konfirmasi Hapus Foto Dokumen')).toBeInTheDocument();
    expect(screen.getByText(/Apakah Anda yakin ingin menghapus foto dokumen surat kesepakatan ini\?/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Ya, Hapus Foto/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(spkService.updateAgreementPhotos).toHaveBeenCalledWith('SPK-2026-0099', []);
    });
    expect(onUpdatedMock).toHaveBeenCalledTimes(1);
  });

  it('hides upload and delete buttons in readOnly mode', () => {
    render(<SpkAgreementPhotos spk={mockSpk} onUpdated={vi.fn()} readOnly={true} />);

    expect(screen.queryByText(/Unggah Dokumen/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('delete-photo-0')).not.toBeInTheDocument();
  });
});

