import React, { useState, useRef } from 'react';
import { X, Loader2, Upload, Camera, Trash2 } from 'lucide-react';
import { getOptimizedImageUrl } from '../../lib/cloudinary';
import type { UploadedImage } from '../ui/CloudinaryUploader';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canModifyGallery = profile?.role === 'owner' || profile?.role === 'service_advisor';

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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(10);
      
      const compressedFile = await compressImage(file);
      setUploadProgress(30);

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
      setUploadProgress(80);

      const newPhoto: UploadedImage = {
        secure_url: data.secure_url,
        public_id: data.public_id,
        angle: `Tambahan ${Math.random().toString(36).substring(2, 6).toUpperCase()}`
      };

      const currentPhotos = spk.vehicle_photos || [];
      const updatedPhotos = [...currentPhotos, newPhoto];

      const { error: dbError } = await supabase
        .from('spk')
        .update({ vehicle_photos: updatedPhotos })
        .eq('id', spk.id);

      if (dbError) throw dbError;
      setUploadProgress(100);

      if (onPhotoAdded) {
        onPhotoAdded({ ...spk, vehicle_photos: updatedPhotos });
      }
      
    } catch (err: any) {
      console.error('Upload Error:', err);
      setError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (photoToDelete: UploadedImage) => {
    if (!confirm('Apakah Anda yakin ingin menghapus foto ini?')) return;

    try {
      setError(null);
      const currentPhotos = spk.vehicle_photos || [];
      const updatedPhotos = currentPhotos.filter(p => p.public_id !== photoToDelete.public_id);

      const { error: dbError } = await supabase
        .from('spk')
        .update({ vehicle_photos: updatedPhotos })
        .eq('id', spk.id);

      if (dbError) throw dbError;

      if (onPhotoAdded) {
        onPhotoAdded({ ...spk, vehicle_photos: updatedPhotos });
      }
      if (lightboxImage?.public_id === photoToDelete.public_id) {
        setLightboxImage(null);
      }
    } catch (err: any) {
      console.error('Delete Error:', err);
      setError('Gagal menghapus foto: ' + (err.message || 'Unknown error'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative">
        
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

          {canModifyGallery && (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-surface p-4 rounded-lg border border-border border-dashed gap-4">
              <div>
                <p className="text-sm font-medium text-text">Tambah Foto Lainnya</p>
                <p className="text-xs text-text-muted">Unggah foto tambahan untuk SPK ini (misal: cacat bodi, detail spesifik).</p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleUpload}
                  disabled={isUploading}
                  className="hidden"
                />
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full sm:w-auto bg-primary hover:bg-primary-hover text-background px-4 py-2 rounded text-sm font-bold flex items-center justify-center gap-2 transition disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
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
            </div>
          )}

          {!spk.vehicle_photos || spk.vehicle_photos.length === 0 ? (
            <div className="text-center py-12 text-text-muted bg-surface/50 rounded-lg border border-border border-dashed">
              Belum ada foto 360° yang diunggah untuk kendaraan ini.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {spk.vehicle_photos.map((photo, index) => (
                <div 
                  key={index} 
                  className="border border-border rounded-lg overflow-hidden flex flex-col bg-surface relative group"
                >
                  <div 
                    className="aspect-square bg-surface-hover relative overflow-hidden cursor-pointer"
                    onClick={() => setLightboxImage(photo)}
                  >
                    <img
                      src={getOptimizedImageUrl(photo.secure_url, 400)}
                      alt={`Vehicle ${photo.angle}`}
                      loading="lazy"
                      className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </div>
                  
                  {canModifyGallery && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(photo);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-status-danger text-white rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-status-danger/80 shadow-md"
                      title="Hapus Foto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div 
                    className="p-2 text-center border-t border-border bg-surface cursor-pointer"
                    onClick={() => setLightboxImage(photo)}
                  >
                    <span className="text-xs font-bold text-text-muted uppercase">{photo.angle}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
