export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  format: string;
  bytes: number;
}

/**
 * Sisipkan kompresi otomatis f_auto, q_auto dan pembatas resolusi c_limit, w_{width}
 */
export function getOptimizedImageUrl(url: string, width = 800): string {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return url;

  const transformation = `f_auto,q_auto,c_limit,w_${width}`;

  if (url.includes('/upload/')) {
    // If already transformed with /upload/f_auto..., replace the existing transformation block
    if (url.includes('/upload/f_auto')) {
      return url.replace(/\/upload\/f_auto[^/]*\//, `/upload/${transformation}/`);
    }
    return url.replace('/upload/', `/upload/${transformation}/`);
  }

  return url;
}

/**
 * Helper Direct Client Upload ke Cloudinary (Zero server bandwidth).
 */
export async function uploadToCloudinary(
  file: File, 
  folderPath: string = 'karoseriops/spk_agreements',
  customPublicId?: string
): Promise<CloudinaryUploadResponse> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Konfigurasi Cloudinary (Cloud Name / Preset) belum diset di .env');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', folderPath);
  if (customPublicId) {
    formData.append('public_id', customPublicId);
  }

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Gagal mengunggah foto ke Cloudinary');
  }

  return await response.json();
}

