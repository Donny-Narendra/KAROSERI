import React, { useState } from 'react';
import { Camera, Loader2, X } from 'lucide-react';

export interface UploadedImage {
  secure_url: string;
  public_id: string;
  angle: string;
}

interface CloudinaryUploaderProps {
  onUploadSuccess: (image: UploadedImage) => void;
  onUploadRemove: (publicId: string) => void;
  uploadedImages: UploadedImage[];
}

const ANGLES = ['depan', 'belakang', 'kanan', 'kiri', 'interior'];

export const CloudinaryUploader: React.FC<CloudinaryUploaderProps> = ({
  onUploadSuccess,
  onUploadRemove,
  uploadedImages,
}) => {
  const [uploading, setUploading] = useState<string | null>(null); // tracks which angle is uploading
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

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

  const uploadFile = async (file: File, angle: string) => {
    try {
      setUploading(angle);
      setError(null);
      setProgress(10);
      
      const compressedFile = await compressImage(file);
      setProgress(40);

      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'karoseri_unsigned');
      formData.append('context', `angle=${angle}`); // Store angle in Cloudinary metadata

      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      if (!cloudName) throw new Error("Cloudinary cloud name is missing in env (VITE_CLOUDINARY_CLOUD_NAME)");

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to upload to Cloudinary');
      }

      const data = await response.json();
      setProgress(100);
      
      onUploadSuccess({
        secure_url: data.secure_url,
        public_id: data.public_id,
        angle: angle,
      });

    } catch (err: any) {
      console.error('Upload Error:', err);
      setError(err.message || 'Upload failed');
    } finally {
      setTimeout(() => {
        setUploading(null);
        setProgress(0);
      }, 500);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, angle: string) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0], angle);
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-status-danger/10 border border-status-danger text-status-danger px-4 py-3 rounded text-sm flex justify-between items-center">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="hover:text-status-danger/80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {ANGLES.map(angle => {
          const uploadedImg = uploadedImages.find(img => img.angle === angle);
          const isUploadingThis = uploading === angle;
          
          return (
            <div key={angle} className="border border-border rounded-lg p-3 flex flex-col items-center justify-center relative bg-surface hover:bg-surface-hover transition aspect-square">
              {uploadedImg ? (
                <div className="w-full h-full relative group">
                  <img 
                    src={uploadedImg.secure_url.replace('/upload/', '/upload/w_200,c_fill/')} 
                    alt={angle}
                    className="w-full h-full object-cover rounded"
                  />
                  <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-2 rounded">
                    <span className="text-xs font-bold uppercase">{angle}</span>
                    <button 
                      type="button"
                      onClick={() => onUploadRemove(uploadedImg.public_id)}
                      className="bg-status-danger text-white p-1 rounded-full hover:bg-status-danger/80"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, angle)}
                    disabled={uploading !== null}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  {isUploadingThis ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="w-8 h-8 mb-2 text-primary animate-spin" />
                      <span className="text-xs font-bold text-primary uppercase text-center">{progress}%</span>
                    </div>
                  ) : (
                    <>
                      <Camera className={`w-8 h-8 mb-2 ${uploading ? 'text-border' : 'text-text-muted'}`} />
                      <span className="text-xs font-bold text-text-muted uppercase text-center">{angle}</span>
                    </>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
