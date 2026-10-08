---
phase: 26
plan: 1
wave: 1
---

# Plan 26.1: Integrasi Cloudinary Direct Upload untuk Foto Kendaraan 360° (Check-in)

## Objective
Mengimplementasikan integrasi Cloudinary Direct Client Delivery & Upload untuk foto kendaraan 360° pada form "Vehicle Check-in" (Pendaftaran SPK Baru). Ini akan memastikan server memiliki konsumsi bandwidth 0 MB untuk gambar dan meningkatkan performa penyajian gambar melalui CDN Cloudinary.

## Context
- `.gsd/SPEC.md`
- `.gsd/ROADMAP.md`
- `.env.local`

## Tasks

<task type="auto">
  <name>Konfigurasi Utility Cloudinary dan Supabase Schema</name>
  <files>
    - `src/lib/cloudinary.ts`
    - `supabase/migrations/20261008210000_add_vehicle_photos_schema.sql` (buat baru)
  </files>
  <action>
    - Buat berkas helper `src/lib/cloudinary.ts`.
    - Di dalamnya, buat helper utility `getOptimizedImageUrl(url, width)` yang menyisipkan parameter transformasi URL Cloudinary (`f_auto`, `q_auto`, `c_limit,w_{width}`) pada URL gambar secure Cloudinary.
    - Buat file migration `supabase/migrations/[TIMESTAMP]_add_vehicle_photos_schema.sql` (gunakan format penamaan yang sesuai dengan pola ada) untuk menambahkan JSONB field `vehicle_photos` ke dalam tabel `spk`, atau buat tabel khusus `vehicle_photos` yang berelasi ke `spk`. Sesuai instruksi, simpan metadata (Cloudinary secure_url/public_id dan tag sudut 360°). 
  </action>
  <verify>
    Validasi syntax file migrasi dan jalankan db reset jika perlu. Verifikasi `getOptimizedImageUrl` memiliki logika string replace/regex yang benar untuk menyisipkan `/image/upload/f_auto,q_auto,c_limit,w_WIDTH/` jika tidak ada.
  </verify>
  <done>
    Helper image selesai, migrasi siap di-push ke lokal, schema DB siap.
  </done>
</task>

<task type="auto">
  <name>Implementasi Kompresi dan Direct Upload (Client-Side)</name>
  <files>
    - `src/components/spk/VehicleCheckInForm.tsx`
    - `src/components/ui/CloudinaryUploader.tsx` (komponen baru)
  </files>
  <action>
    - Buat komponen `CloudinaryUploader.tsx` untuk input file (image/*).
    - Terapkan kompresi lokal sebelum file diunggah. Bisa menggunakan library ringan, canvas, atau `browser-image-compression`. 
    - Lakukan fetch API POST langsung ke `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload` menggunakan FormData.
    - Sertakan payload `{ file, upload_preset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET }`.
    - Implementasikan state handling (progress spinner per foto, opsi retry).
  </action>
  <verify>
    Render test component untuk memastikan POST Request dilakukan ke Cloudinary dan bukan Supabase function.
  </verify>
  <done>
    File terkompresi dan berhasil diupload mandiri dari klien, menerima respon JSON dengan URL dari Cloudinary.
  </done>
</task>

<task type="auto">
  <name>Integrasi SPK & Tampilan Galeri Kendaraan</name>
  <files>
    - `src/components/spk/VehicleGallery.tsx` (komponen baru)
    - `src/components/spk/VehicleCheckInForm.tsx`
  </files>
  <action>
    - Pasang `CloudinaryUploader` pada form Vehicle Check-In, kaitkan field 360° (depan, belakang, interior, dll).
    - Tambahkan payload foto ini pada submit form register SPK.
    - Buat `VehicleGallery.tsx` menggunakan `getOptimizedImageUrl` untuk setiap render tag `<img>`. Gunakan atribut `loading="lazy"`.
    - Tambahkan properti `srcSet` responsif untuk optimasi multi-device (w_320, w_768, w_1024).
  </action>
  <verify>
    Lakukan submit SPK tiruan dan verifikasi datanya terkirim ke database via API Call Supabase dan merender gambar melalui galeri dengan benar tanpa proxied backend.
  </verify>
  <done>
    Foto 360 terintegrasi saat pendaftaran dan galeri gambar dirender sempurna via Direct CDN Delivery.
  </done>
</task>

## Success Criteria
- [ ] Foto diunggah dari client ke Cloudinary API tanpa proxy backend lokal.
- [ ] Bukti file gambar tidak menyentuh Supabase Storage, konsumsi bandwidth storage 0 MB.
- [ ] Database menampung ID gambar dengan informasi posisi/sudut (depan, samping kiri, dsb).
- [ ] Halaman galeri mengambil gambar Cloudinary dengan transformasi optimal CDN.
