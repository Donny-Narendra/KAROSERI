import React, { useState } from 'react';
import { X } from 'lucide-react';
import { getOptimizedImageUrl } from '../../lib/cloudinary';
import type { UploadedImage } from '../ui/CloudinaryUploader';

interface SpkGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  spk: {
    spk_no: string;
    vehicle_plate: string;
    customer_name: string;
    vehicle_photos?: UploadedImage[] | null;
  } | null;
}

export const SpkGalleryModal: React.FC<SpkGalleryModalProps> = ({ isOpen, onClose, spk }) => {
  const [lightboxImage, setLightboxImage] = useState<UploadedImage | null>(null);

  if (!isOpen || !spk) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-border">
          <div>
            <h3 className="font-display font-bold text-lg text-text">Galeri Foto 360° - {spk.spk_no}</h3>
            <p className="text-sm text-text-muted font-mono">{spk.vehicle_plate} • {spk.customer_name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-text-muted hover:text-status-danger transition rounded-full hover:bg-surface-hover">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {!spk.vehicle_photos || spk.vehicle_photos.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              Belum ada foto 360° yang diunggah untuk kendaraan ini.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {spk.vehicle_photos.map((photo, index) => (
                <div 
                  key={index} 
                  className="border border-border rounded-lg overflow-hidden flex flex-col bg-surface cursor-pointer group"
                  onClick={() => setLightboxImage(photo)}
                >
                  <div className="aspect-square bg-surface-hover relative overflow-hidden">
                    <img
                      src={getOptimizedImageUrl(photo.secure_url, 400)}
                      alt={`Vehicle ${photo.angle}`}
                      loading="lazy"
                      className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </div>
                  <div className="p-2 text-center border-t border-border bg-surface">
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
