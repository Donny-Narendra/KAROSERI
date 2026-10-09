import React, { useState } from 'react';
import { Camera, Loader2, X, Maximize2 } from 'lucide-react';
import { getOptimizedImageUrl } from '../lib/cloudinary';

export interface WbsAsset {
  id?: string;
  file_url: string;
  wbs_category: string;
  created_at?: string;
  profiles?: {
    full_name: string;
    role: string;
  } | null;
}

interface WbsGalleryUploaderProps {
  wbsCategory: string;
  assets: WbsAsset[];
  onUploadSuccess: (asset: WbsAsset) => void;
  onUploadRemove: (fileUrl: string) => void;
}

export const WbsGalleryUploader: React.FC<WbsGalleryUploaderProps> = ({
  wbsCategory,
  assets,
  onUploadSuccess,
  onUploadRemove
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
            if (!blob) return reject('Compression failed');
            resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
          },
          'image/jpeg',
          0.8
        );
      };
      img.onerror = (err) => reject(err);
    });
  };

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);
      setError(null);
      setProgress(10);
      
      const compressedFile = await compressImage(file);
      setProgress(40);

      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'karoseri_unsigned');

      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      if (!cloudName) throw new Error("Cloudinary cloud name is missing in env");

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload to Cloudinary');
      }

      const data = await response.json();
      setProgress(100);
      
      onUploadSuccess({
        file_url: data.secure_url,
        wbs_category: wbsCategory
      });

    } catch (err: any) {
      console.error('Upload Error:', err);
      setError(err.message || 'Upload failed');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 500);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-4 mt-4 bg-background p-4 rounded border border-border/50">
      <div className="flex items-center justify-between mb-2">
        <h5 className="font-semibold text-text text-sm">Galeri Lapangan</h5>
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <button 
            type="button"
            disabled={uploading}
            className="px-3 py-1.5 bg-primary text-white text-sm rounded hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50 pointer-events-none"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            {uploading ? `Uploading ${progress}%` : 'Upload Bukti'}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-status-danger/10 border border-status-danger text-status-danger px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}

      {assets.length === 0 ? (
        <div className="text-center py-6 text-text-muted text-sm border border-dashed border-border rounded">
          Belum ada foto bukti pengerjaan.
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {assets.map((asset, idx) => (
            <div key={asset.id || idx} className="border border-border rounded overflow-hidden relative group aspect-square bg-surface">
              <img 
                src={getOptimizedImageUrl(asset.file_url, 200)}
                alt="WBS asset"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button 
                  type="button"
                  onClick={() => setPreviewImage(asset.file_url)}
                  className="bg-primary/90 text-white p-1.5 rounded-full hover:bg-primary"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button 
                  type="button"
                  onClick={() => onUploadRemove(asset.file_url)}
                  className="bg-status-danger/90 text-white p-1.5 rounded-full hover:bg-status-danger"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-white text-[10px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="truncate font-medium">{asset.profiles?.full_name || 'Unknown User'}</div>
                <div className="text-white/80">{asset.created_at ? new Date(asset.created_at).toLocaleString('id-ID') : 'Baru saja'}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox / Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setPreviewImage(null)}>
          <button 
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setPreviewImage(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img 
            src={getOptimizedImageUrl(previewImage, 1200)} 
            alt="Preview" 
            className="max-w-full max-h-[90vh] object-contain rounded"
          />
        </div>
      )}
    </div>
  );
};
