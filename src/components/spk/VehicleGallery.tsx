import React from 'react';
import { getOptimizedImageUrl } from '../../lib/cloudinary';
import type { UploadedImage } from '../ui/CloudinaryUploader';

interface VehicleGalleryProps {
  photos?: UploadedImage[];
}

export const VehicleGallery: React.FC<VehicleGalleryProps> = ({ photos }) => {
  if (!photos || photos.length === 0) return null;

  return (
    <div className="mt-6">
      <h4 className="text-lg font-bold font-display text-text mb-4">Vehicle 360° Photos</h4>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {photos.map((photo, index) => (
          <div key={index} className="border border-border rounded-lg overflow-hidden flex flex-col bg-surface">
            <div className="aspect-square bg-surface-hover relative group overflow-hidden">
              <img
                src={getOptimizedImageUrl(photo.secure_url, 400)}
                srcSet={`
                  ${getOptimizedImageUrl(photo.secure_url, 320)} 320w,
                  ${getOptimizedImageUrl(photo.secure_url, 768)} 768w,
                  ${getOptimizedImageUrl(photo.secure_url, 1024)} 1024w
                `}
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                alt={`Vehicle ${photo.angle}`}
                loading="lazy"
                className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
              />
            </div>
            <div className="p-2 text-center border-t border-border bg-surface">
              <span className="text-xs font-bold text-text-muted uppercase">{photo.angle}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
