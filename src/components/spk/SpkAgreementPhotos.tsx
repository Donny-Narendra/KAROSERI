import React, { useState, useRef } from 'react';
import { Upload, Loader2, Trash2, FileText, AlertCircle, X, Maximize2 } from 'lucide-react';
import { getOptimizedImageUrl, uploadToCloudinary } from '../../utils/cloudinary';
import { spkService } from '../../services/spkService';
import { ConfirmationModal } from '../ConfirmationModal';
import type { Spk, AgreementPhoto } from '../../types/spk';

interface SpkAgreementPhotosProps {
  spk: Spk;
  onUpdated: () => void;
  readOnly?: boolean;
}

export const SpkAgreementPhotos: React.FC<SpkAgreementPhotosProps> = ({
  spk,
  onUpdated,
  readOnly = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const [lightboxPhoto, setLightboxPhoto] = useState<AgreementPhoto | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<AgreementPhoto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const photos: AgreementPhoto[] = Array.isArray(spk.agreement_photos)
    ? spk.agreement_photos
    : [];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    setIsUploading(true);
    setError(null);

    const newlyUploaded: AgreementPhoto[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadStatus(`Mengunggah foto ${i + 1} dari ${files.length}...`);

        const randomHash = Math.random().toString(36).substring(2, 8);
        const customPublicId = `${spk.spk_no}_${Date.now()}_${randomHash}`;

        // Direct Client-to-Cloudinary Upload (0 MB server bandwidth)
        const res = await uploadToCloudinary(file, 'karoseriops/spk_agreements', customPublicId);

        newlyUploaded.push({
          url: res.secure_url,
          secure_url: res.secure_url,
          public_id: res.public_id,
          format: res.format,
          bytes: res.bytes,
          uploaded_at: new Date().toISOString(),
        });
      }

      const mergedPhotos = [...photos, ...newlyUploaded];
      await spkService.updateAgreementPhotos(spk.spk_no, mergedPhotos);
      onUpdated();
    } catch (err: any) {
      console.error('Error uploading agreement document photo:', err);
      setError(err.message || 'Gagal mengunggah foto surat kesepakatan kerja.');
    } finally {
      setIsUploading(false);
      setUploadStatus('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!photoToDelete) return;

    setIsDeleting(true);
    try {
      const filtered = photos.filter((p) => p.public_id !== photoToDelete.public_id);
      await spkService.updateAgreementPhotos(spk.spk_no, filtered);
      setPhotoToDelete(null);
      onUpdated();
    } catch (err: any) {
      console.error('Error deleting agreement photo:', err);
      setError(err.message || 'Gagal menghapus foto surat kesepakatan.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-border/70">
      {/* Header and Upload action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-sm text-text">
            Dokumentasi Surat Kesepakatan Kerja
          </h4>
          <span className="bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded text-xs font-mono font-medium">
            {photos.length} Berkas
          </span>
        </div>

        {!readOnly && (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              multiple
              disabled={isUploading}
              className="hidden"
              data-testid="agreement-photo-input"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              title="Unggah foto dokumen surat kesepakatan kerja"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{uploadStatus || 'Mengunggah...'}</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Unggah Dokumen</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-3 bg-status-danger/10 border border-status-danger text-status-danger px-3 py-2 rounded text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Gallery Thumbnail Grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {photos.map((photo, index) => {
            const photoUrl = photo.url || photo.secure_url;
            return (
              <div
                key={photo.public_id || index}
                className="group relative bg-background border border-border hover:border-primary/50 rounded-lg overflow-hidden transition shadow-2xs aspect-square flex flex-col"
              >
                {/* Thumbnail using w_300 Cloudinary transform for fast responsive delivery */}
                <div
                  className="relative w-full h-full cursor-pointer overflow-hidden bg-slate-900/50"
                  onClick={() => setLightboxPhoto(photo)}
                  title="Klik untuk melihat pratinjau penuh"
                >
                  <img
                    src={getOptimizedImageUrl(photoUrl, 300)}
                    alt={`Surat Kesepakatan ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <span className="p-1.5 bg-black/60 text-white rounded-full hover:bg-primary transition">
                      <Maximize2 className="w-4 h-4" />
                    </span>
                  </div>
                </div>

                {/* Footer badge with index & delete button */}
                <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/80 via-black/40 to-transparent p-1.5 flex items-center justify-between text-[11px] text-white pointer-events-auto">
                  <span className="font-mono text-[10px] truncate max-w-[80px]">
                    Foto #{index + 1}
                  </span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhotoToDelete(photo);
                      }}
                      className="p-1 hover:text-rose-400 rounded transition cursor-pointer text-slate-300"
                      title="Hapus foto ini"
                      data-testid={`delete-photo-${index}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-background/40 border border-dashed border-border/80 text-center text-xs text-text-muted">
          Belum ada foto surat kesepakatan kerja. Klik tombol{' '}
          <strong className="text-text">Unggah Dokumen</strong> untuk menambahkan foto
          berkas kesepakatan kerja yang telah ditandatangani.
        </div>
      )}

      {/* Lightbox Modal (Resolution: w_1600, c_limit, f_auto, q_auto) */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-surface rounded-xl overflow-hidden border border-border shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-hover">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm text-text">
                  Pratinjau Surat Kesepakatan Kerja: {spk.spk_no}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                className="text-text-muted hover:text-text p-1 rounded-lg hover:bg-surface-active transition cursor-pointer"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 overflow-auto flex items-center justify-center bg-black/40">
              <img
                src={getOptimizedImageUrl(lightboxPhoto.url || lightboxPhoto.secure_url, 1600)}
                alt="Pratinjau Penuh Surat Kesepakatan"
                className="max-h-[80vh] w-auto object-contain rounded"
              />
            </div>
            {lightboxPhoto.uploaded_at && (
              <div className="px-4 py-2 bg-surface border-t border-border text-[11px] text-text-muted flex justify-between">
                <span>Diunggah: {new Date(lightboxPhoto.uploaded_at).toLocaleString('id-ID')}</span>
                {lightboxPhoto.bytes && (
                  <span>Ukuran: {(lightboxPhoto.bytes / 1024).toFixed(1)} KB</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deletion */}
      <ConfirmationModal
        isOpen={Boolean(photoToDelete)}
        title="Konfirmasi Hapus Foto Dokumen"
        message="Apakah Anda yakin ingin menghapus foto dokumen surat kesepakatan ini? Metadata foto akan dihapus dari data SPK."
        confirmText="Ya, Hapus Foto"
        cancelText="Batal"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPhotoToDelete(null)}
      />
    </div>
  );
};
