import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOptimizedImageUrl, uploadToCloudinary } from '../cloudinary';

describe('cloudinary utils', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  describe('getOptimizedImageUrl', () => {
    it('returns original url if empty or not a string', () => {
      expect(getOptimizedImageUrl('')).toBe('');
      expect(getOptimizedImageUrl(null as any)).toBe(null);
    });

    it('returns original url if not from cloudinary.com', () => {
      const nonCloudinary = 'https://example.com/images/car.jpg';
      expect(getOptimizedImageUrl(nonCloudinary)).toBe(nonCloudinary);
    });

    it('injects f_auto,q_auto,c_limit,w_{width} after /upload/', () => {
      const original = 'https://res.cloudinary.com/demo/image/upload/v12345/sample.jpg';
      const expected = 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_800/v12345/sample.jpg';
      expect(getOptimizedImageUrl(original, 800)).toBe(expected);
    });

    it('supports custom widths such as 200, 300, and 1600', () => {
      const original = 'https://res.cloudinary.com/demo/image/upload/v12345/agreement.jpg';
      expect(getOptimizedImageUrl(original, 200)).toBe(
        'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_200/v12345/agreement.jpg'
      );
      expect(getOptimizedImageUrl(original, 300)).toBe(
        'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_300/v12345/agreement.jpg'
      );
      expect(getOptimizedImageUrl(original, 1600)).toBe(
        'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_1600/v12345/agreement.jpg'
      );
    });

    it('replaces existing transformation cleanly if already transformed', () => {
      const alreadyTransformed = 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_200/v12345/sample.jpg';
      const retransformed = getOptimizedImageUrl(alreadyTransformed, 1600);
      expect(retransformed).toBe(
        'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_1600/v12345/sample.jpg'
      );
    });
  });

  describe('uploadToCloudinary', () => {
    it('throws error if cloud name or upload preset is missing', async () => {
      const originalCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const originalPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

      try {
        delete (import.meta.env as any).VITE_CLOUDINARY_CLOUD_NAME;
        const fakeFile = new File(['hello'], 'contract.pdf', { type: 'image/jpeg' });
        await expect(uploadToCloudinary(fakeFile)).rejects.toThrow(
          'Konfigurasi Cloudinary (Cloud Name / Preset) belum diset di .env'
        );
      } finally {
        import.meta.env.VITE_CLOUDINARY_CLOUD_NAME = originalCloudName;
        import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET = originalPreset;
      }
    });

    it('uploads directly to Cloudinary endpoint using FormData and returns response', async () => {
      import.meta.env.VITE_CLOUDINARY_CLOUD_NAME = 'test_cloud';
      import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET = 'test_preset';

      const mockResponseData = {
        secure_url: 'https://res.cloudinary.com/test_cloud/image/upload/v1/karoseriops/spk_agreements/doc.jpg',
        public_id: 'karoseriops/spk_agreements/doc',
        format: 'jpg',
        bytes: 10240,
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponseData,
      });
      globalThis.fetch = mockFetch;

      const fakeFile = new File(['image-bytes'], 'agreement.jpg', { type: 'image/jpeg' });
      const result = await uploadToCloudinary(fakeFile, 'karoseriops/spk_agreements', 'custom_id_123');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.cloudinary.com/v1_1/test_cloud/image/upload');
      expect(options.method).toBe('POST');
      expect(options.body).toBeInstanceOf(FormData);

      const formData = options.body as FormData;
      expect(formData.get('upload_preset')).toBe('test_preset');
      expect(formData.get('folder')).toBe('karoseriops/spk_agreements');
      expect(formData.get('public_id')).toBe('custom_id_123');

      expect(result).toEqual(mockResponseData);
    });

    it('throws error with API message if Cloudinary returns non-ok response', async () => {
      import.meta.env.VITE_CLOUDINARY_CLOUD_NAME = 'test_cloud';
      import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET = 'test_preset';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: 'Invalid upload preset' } }),
      });
      globalThis.fetch = mockFetch;

      const fakeFile = new File(['image-bytes'], 'agreement.jpg', { type: 'image/jpeg' });
      await expect(uploadToCloudinary(fakeFile)).rejects.toThrow('Invalid upload preset');
    });
  });
});
