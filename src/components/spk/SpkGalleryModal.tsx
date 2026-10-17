import React, { useState, useRef } from 'react';
import { X, Loader2, Upload, Camera, Trash2 } from 'lucide-react';
import { getOptimizedImageUrl } from '../../lib/cloudinary';
import type { UploadedImage } from '../ui/CloudinaryUploader';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { ConfirmationModal } from '../ConfirmationModal';

const STANDARD_ANGLES = ['depan', 'belakang', 'kanan', 'kiri', 'interior'] as const;
export type StandardAngle = typeof STANDARD_ANGLES[number];

export interface Vehicle360Slots {
  depan: string | null;
  belakang: string | null;
  kanan: string | null;
  kiri: string | null;
  interior: string | null;
}

interface PendingDeletePhoto {
  type: 'slot' | 'additional';
  position?: StandardAngle;
  photo?: UploadedImage;
  label: string;
}

interface SpkGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoAdded?: (updatedSpk: any) => void;
  spk: {
    id: string;
    spk_no: string;
    vehicle_plate: string;
    customer_name: string;
    vehicle_photos?: UploadedImage[] | null;
  } | null;
}

export const SpkGalleryModal: React.FC<SpkGalleryModalProps> = ({ isOpen, onClose, onPhotoAdded, spk }) => {
  const { profile } = useAuth();
  const [lightboxImage, setLightboxImage] = useState<UploadedImage | null>(null);
  const [slotUploading, setSlotUploading] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<PendingDeletePhoto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fixed positional slots state
  const [slots, setSlots] = useState<Vehicle360Slots>({
    depan: null,
    belakang: null,
    kanan: null,
    kiri: null,
    interior: null,
  });
  const [slotPublicIds, setSlotPublicIds] = useState<Record<StandardAngle, string | null>>({
    depan: null,
    belakang: null,
    kanan: null,
    kiri: null,
    interior: null,
  });
  const [additionalPhotos, setAdditionalPhotos] = useState<UploadedImage[]>([]);

  const canModifyGallery = profile?.role === 'owner' || profile?.role === 'service_advisor';

  // Sinkronisasi data awal saat modal dibuka atau objek spk berubah
  React.useEffect(() => {
    if (!spk) return;

    const newSlots: Vehicle360Slots = {
      depan: null,
      belakang: null,
      kanan: null,
      kiri: null,
      interior: null,
    };
    const newPublicIds: Record<StandardAngle, string | null> = {
      depan: null,
      belakang: null,
      kanan: null,
      kiri: null,
      interior: null,
    };
    const newAdditional: UploadedImage[] = [];

    const rawPhotos = spk.vehicle_photos;

    if (Array.isArray(rawPhotos)) {
      for (const item of rawPhotos) {
        if (!item || !item.secure_url) continue;
        const angleKey = (item.angle || '').toLowerCase().trim();
        if (STANDARD_ANGLES.includes(angleKey as StandardAngle) && !newSlots[angleKey as StandardAngle]) {
          newSlots[angleKey as StandardAngle] = item.secure_url;
          newPublicIds[angleKey as StandardAngle] = item.public_id || null;
        } else {
          newAdditional.push(item);
        }
      }
    } else if (rawPhotos && typeof rawPhotos === 'object') {
      const s = (rawPhotos as any).slots || {};
      for (const angle of STANDARD_ANGLES) {
        const val = s[angle];
        if (typeof val === 'string') {
          newSlots[angle] = val;
        } else if (val && typeof val === 'object' && val.secure_url) {
          newSlots[angle] = val.secure_url;
          newPublicIds[angle] = val.public_id || null;
        }
      }
      const add = (rawPhotos as any).additional_photos || [];
      if (Array.isArray(add)) {
        newAdditional.push(...add);
      }
    }

    setSlots(newSlots);
    setSlotPublicIds(newPublicIds);
    setAdditionalPhotos(newAdditional);
  }, [spk]);

  if (!isOpen || !spk) return null;

  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('No canvas context');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Compression failed (blob is null)'));
            const fileName = file.name || `camera_${Date.now()}.jpg`;
            resolve(new File([blob], fileName, { type: 'image/jpeg', lastModified: Date.now() }));
          },
          'image/jpeg',
          0.8
        );
      };
      img.onerror = () => reject(new Error('Gagal memuat gambar. Format mungkin tidak didukung atau memori HP tidak cukup.'));
    });
  };

  const syncToSupabase = async (
    currentSlots: Vehicle360Slots,
    currentPublicIds: Record<StandardAngle, string | null>,
    currentAdditional: UploadedImage[]
  ) => {
    if (!spk) return;

    const standardPhotos: UploadedImage[] = STANDARD_ANGLES
      .filter((angle) => currentSlots[angle] !== null)
      .map((angle) => ({
        secure_url: currentSlots[angle]!,
        public_id: currentPublicIds[angle] || `spk_${spk.spk_no}_${angle}_${Date.now()}`,
        angle: angle,
      }));

    const updatedPhotos: UploadedImage[] = [...standardPhotos, ...currentAdditional];

    const { error: dbError } = await supabase
      .from('spk')
      .update({ vehicle_photos: updatedPhotos })
      .eq('id', spk.id);

    if (dbError) throw dbError;

    if (onPhotoAdded) {
      onPhotoAdded({ ...spk, vehicle_photos: updatedPhotos });
    }
  };

  const uploadSlotFile = async (file: File, position: StandardAngle) => {
    if (!spk) return;

    try {
      setSlotUploading(position);
      setError(null);
      setUploadProgress(15);

      const compressedFile = await compressImage(file);
      setUploadProgress(40);

      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'karoseri_unsigned');
      formData.append('folder', `karoseriops/spk_${spk.spk_no}`);
      formData.append('context', `angle=${position}`);

      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      if (!cloudName) throw new Error("Cloudinary cloud name is missing in env");

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Gagal mengunggah foto ke Cloudinary');
      }

      const data = await response.json();
      setUploadProgress(85);

      const newSlots: Vehicle360Slots = { ...slots, [position]: data.secure_url };
      const newPublicIds = { ...slotPublicIds, [position]: data.public_id };

      setSlots(newSlots);
      setSlotPublicIds(newPublicIds);

      await syncToSupabase(newSlots, newPublicIds, additionalPhotos);
      setUploadProgress(100);
    } catch (err: any) {
      console.error('Slot Upload Error:', err);
      setError(err.message || 'Gagal mengunggah foto');
    } finally {
      setSlotUploading(null);
      setUploadProgress(0);
    }
  };

  const handleAdditionalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !spk) return;

    try {
      setSlotUploading('additional');
      setError(null);
      setUploadProgress(15);

      const compressedFile = await compressImage(file);
      setUploadProgress(40);

      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'karoseri_unsigned');
      formData.append('folder', `karoseriops/spk_${spk.spk_no}`);
      formData.append('context', `angle=tambahan`);

      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      if (!cloudName) throw new Error("Cloudinary cloud name is missing in env");

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to upload to Cloudinary');
      }

      const data = await response.json();
      setUploadProgress(85);

      const newPhoto: UploadedImage = {
        secure_url: data.secure_url,
        public_id: data.public_id,
        angle: `Tambahan ${Math.random().toString(36).substring(2, 6).toUpperCase()}`
      };

      const updatedAdditional = [...additionalPhotos, newPhoto];
      setAdditionalPhotos(updatedAdditional);

      await syncToSupabase(slots, slotPublicIds, updatedAdditional);
      setUploadProgress(100);
    } catch (err: any) {
      console.error('Upload Error:', err);
      setError(err.message || 'Upload failed');
    } finally {
      setSlotUploading(null);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const executeDeletePhoto = async () => {
    if (!photoToDelete || !spk) return;

    try {
      setIsDeleting(true);
      setError(null);

      if (photoToDelete.type === 'slot' && photoToDelete.position) {
        const pos = photoToDelete.position;
        // Update state posisi tersebut menjadi null
        const newSlots: Vehicle360Slots = { ...slots, [pos]: null };
        const newPublicIds = { ...slotPublicIds, [pos]: null };
        setSlots(newSlots);
        setSlotPublicIds(newPublicIds);

        await syncToSupabase(newSlots, newPublicIds, additionalPhotos);

        if (lightboxImage?.angle === pos) {
          setLightboxImage(null);
        }
      } else if (photoToDelete.type === 'additional' && photoToDelete.photo) {
        const targetPublicId = photoToDelete.photo.public_id;
        const updatedAdditional = additionalPhotos.filter(p => p.public_id !== targetPublicId);
        setAdditionalPhotos(updatedAdditional);

        await syncToSupabase(slots, slotPublicIds, updatedAdditional);

        if (lightboxImage?.public_id === targetPublicId) {
          setLightboxImage(null);
        }
      }

      setPhotoToDelete(null);
    } catch (err: any) {
      console.error('Delete Error:', err);
      setError('Gagal menghapus foto: ' + (err.message || 'Unknown error'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-border">
          <div>
            <h3 className="font-display font-bold text-lg text-text flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              Galeri Foto 360° - {spk.spk_no}
            </h3>
            <p className="text-sm text-text-muted font-mono">{spk.vehicle_plate} • {spk.customer_name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-text-muted hover:text-status-danger transition rounded-full hover:bg-surface-hover">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          {error && (
            <div className="bg-status-danger/10 border border-status-danger text-status-danger px-4 py-3 rounded text-sm flex justify-between items-center">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="hover:text-status-danger/80">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Bagian 1: 5 Slot Posisi Standar 360° */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold font-display uppercase tracking-wider text-text flex items-center gap-2">
                  <span>Foto 360° Sudut Standar</span>
                  <span className="text-xs font-mono font-normal text-text-muted">
                    ({STANDARD_ANGLES.filter(a => slots[a] !== null).length}/5 Terisi)
                  </span>
                </h4>
                <p className="text-xs text-text-muted">
                  5 sudut inspeksi tetap: DEPAN, BELAKANG, KANAN, KIRI, dan INTERIOR.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {STANDARD_ANGLES.map((position) => {
                const photoUrl = slots[position];
                const isUploadingThis = slotUploading === position;

                return photoUrl !== null ? (
                  <div
                    key={position}
                    className="border border-border rounded-lg overflow-hidden flex flex-col bg-surface shadow-xs transition"
                  >
                    {/* Area Atas: Thumbnail foto kendaraan */}
                    <div
                      className="w-full aspect-video bg-surface-hover relative overflow-hidden cursor-pointer group"
                      onClick={() =>
                        setLightboxImage({
                          secure_url: photoUrl,
                          public_id: slotPublicIds[position] || '',
                          angle: position,
                        })
                      }
                    >
                      <img
                        src={getOptimizedImageUrl(photoUrl, 400)}
                        alt={`Foto ${position}`}
                        loading="lazy"
                        className="w-full h-full object-cover rounded-t-lg transition duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </div>

                    {/* Area Bawah (Card Footer): Kontainer tombol aksi di bawah foto */}
                    <div className="p-2 bg-slate-900/80 border-t border-slate-700/60 rounded-b-lg flex justify-between items-center gap-2">
                      <span
                        className="text-xs font-semibold text-slate-200 capitalize truncate cursor-pointer hover:underline"
                        onClick={() =>
                          setLightboxImage({
                            secure_url: photoUrl,
                            public_id: slotPublicIds[position] || '',
                            angle: position,
                          })
                        }
                      >
                        {position}
                      </span>
                      {canModifyGallery && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhotoToDelete({
                              type: 'slot',
                              position,
                              label: position,
                            });
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-rose-300 hover:text-white bg-rose-500/20 hover:bg-rose-600 border border-rose-500/30 rounded transition-colors shrink-0"
                          title={`Hapus foto ${position}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    key={position}
                    className={`border border-border border-dashed rounded-lg p-3 flex flex-col items-center justify-center relative bg-surface/50 hover:bg-surface hover:border-primary/50 transition aspect-video sm:aspect-auto sm:min-h-[160px] ${
                      !canModifyGallery ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (!canModifyGallery || slotUploading) return;
                      const file = e.dataTransfer.files?.[0];
                      if (file) uploadSlotFile(file, position);
                    }}
                  >
                    {canModifyGallery && (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadSlotFile(file, position);
                          e.target.value = '';
                        }}
                        disabled={slotUploading !== null}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                        title={`Unggah foto ${position.toUpperCase()}`}
                      />
                    )}

                    {isUploadingThis ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="w-8 h-8 mb-2 text-primary animate-spin" />
                        <span className="text-xs font-bold text-primary uppercase text-center font-mono">
                          {uploadProgress}%
                        </span>
                      </div>
                    ) : (
                      <>
                        <Camera
                          className={`w-8 h-8 mb-2 ${
                            slotUploading ? 'text-border' : 'text-text-muted'
                          }`}
                        />
                        <span className="text-xs font-bold text-text-muted uppercase text-center">
                          [{position.toUpperCase()} - Unggah Foto]
                        </span>
                        <span className="text-[10px] text-text-muted/70 mt-1">
                          Klik atau tarik foto ke sini
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bagian 2: Tombol & Daftar Foto Tambahan */}
          <div className="pt-4 border-t border-border space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-surface p-4 rounded-lg border border-border border-dashed gap-4">
              <div>
                <p className="text-sm font-medium text-text">Tambah Foto Lainnya</p>
                <p className="text-xs text-text-muted">
                  Unggah foto inspeksi tambahan di luar 5 sudut standar (misal: detail cacat bodi, interior khusus).
                </p>
              </div>
              {canModifyGallery && (
                <div className="flex gap-2 w-full sm:w-auto">
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleAdditionalUpload}
                    disabled={slotUploading !== null}
                    className="hidden"
                  />
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={slotUploading !== null}
                    className="w-full sm:w-auto bg-primary hover:bg-primary-hover text-background px-4 py-2 rounded text-sm font-bold flex items-center justify-center gap-2 transition disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {slotUploading === 'additional' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {uploadProgress}%
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Pilih Foto
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {additionalPhotos.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-text-muted">
                  Foto Tambahan ({additionalPhotos.length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {additionalPhotos.map((photo, index) => (
                    <div 
                      key={photo.public_id || index} 
                      className="border border-border rounded-lg overflow-hidden flex flex-col bg-surface shadow-xs transition"
                    >
                      {/* Area Atas: Thumbnail foto kendaraan */}
                      <div 
                        className="w-full aspect-video bg-surface-hover relative overflow-hidden cursor-pointer group"
                        onClick={() => setLightboxImage(photo)}
                      >
                        <img
                          src={getOptimizedImageUrl(photo.secure_url, 400)}
                          alt={photo.angle}
                          loading="lazy"
                          className="w-full h-full object-cover rounded-t-lg transition duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </div>

                      {/* Area Bawah (Card Footer): Kontainer tombol aksi di bawah foto */}
                      <div className="p-2 bg-slate-900/80 border-t border-slate-700/60 rounded-b-lg flex justify-between items-center gap-2">
                        <span 
                          className="text-xs font-semibold text-slate-200 capitalize truncate cursor-pointer hover:underline"
                          onClick={() => setLightboxImage(photo)}
                        >
                          {photo.angle}
                        </span>
                        {canModifyGallery && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPhotoToDelete({
                                type: 'additional',
                                photo,
                                label: photo.angle,
                              });
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-rose-300 hover:text-white bg-rose-500/20 hover:bg-rose-600 border border-rose-500/30 rounded transition-colors shrink-0"
                            title="Hapus Foto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Photo Deletion */}
      <ConfirmationModal
        isOpen={!!photoToDelete}
        title="Hapus Foto Kendaraan"
        message="Apakah Anda yakin ingin menghapus foto kendaraan ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Ya, Hapus Foto"
        cancelText="Batal"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={executeDeletePhoto}
        onCancel={() => {
          if (!isDeleting) setPhotoToDelete(null);
        }}
      />

      {/* Lightbox Overlay */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center p-4">
          <button 
            onClick={() => setLightboxImage(null)} 
            className="absolute top-4 right-4 p-3 text-white/70 hover:text-white transition bg-white/10 hover:bg-status-danger rounded-full z-10"
            title="Tutup (Esc)"
          >
            <X className="w-6 h-6" />
          </button>
          
          <img
            src={getOptimizedImageUrl(lightboxImage.secure_url, 1600)}
            alt={lightboxImage.angle}
            className="max-w-full max-h-[85vh] object-contain rounded"
          />
          <div className="mt-4 text-white text-lg font-bold uppercase tracking-wider bg-black/50 px-6 py-2 rounded-full border border-white/20">
            {lightboxImage.angle}
          </div>
        </div>
      )}
    </div>
  );
};
