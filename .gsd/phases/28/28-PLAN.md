---
phase: 28
plan: 1
wave: 1
---

# Plan 28.1: Upload Foto 360° Langsung dari Modal Galeri SPK

## Objective
Implementasikan fitur Direct Upload foto 360° ke Cloudinary langsung dari dalam modal "Galeri Foto 360°" pada SPK terkait di portal Service Advisor (`/service-advisor`), serta simpan URL dan public_id acak (randomized) ke database Supabase. Fitur ini memungkinkan pengguna menambah foto secara ad-hoc tanpa dibatasi oleh 5 sudut wajib.

## Context
- .gsd/SPEC.md
- src/components/spk/SpkGalleryModal.tsx
- src/pages/ServiceAdvisorDashboard.tsx
- src/components/ui/CloudinaryUploader.tsx
- .env (untuk Cloudinary env variables)

## Tasks

<task type="auto">
  <name>Implementasi UI Upload di Modal & Integrasi Cloudinary/Supabase</name>
  <files>src/components/spk/SpkGalleryModal.tsx, src/pages/ServiceAdvisorDashboard.tsx</files>
  <action>
    - Di `SpkGalleryModal.tsx`, tambahkan prop `onPhotoAdded?: (updatedSpk: any) => void` dan `spkId` jika diperlukan.
    - Tambahkan UI untuk drag-and-drop / tombol "+ Tambah Foto 360°" di dalam modal (misalnya di atas grid galeri).
    - Implementasikan logika kompresi (canvas) dan Direct Upload ke Cloudinary menggunakan `fetch` (seperti di `CloudinaryUploader.tsx`), gunakan endpoint `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`.
    - Generate nama/public_id unik sebelum upload: gunakan parameter `public_id` pada `formData` atau gunakan `folder: "karoseriops/spk_${spk_no}"` dengan UUID. Karena ini unsigned upload, cara paling aman adalah melempar custom `folder` pada FormData: `formData.append('folder', 'karoseriops/spk_' + spk.spk_no)` dan membiarkan Cloudinary merandom nama aslinya, ATAU gunakan `crypto.randomUUID()` sebagai identitas lokal (angle label jika tidak ada).
    - Setelah berhasil upload ke Cloudinary, ambil `secure_url`, `public_id`, dan `angle` (misalnya input manual atau otomatis seperti `Tambahan-${crypto.randomUUID().slice(0,4)}`).
    - Buat query Supabase: `supabase.from('spk').select('vehicle_photos').eq('id', spk.id).single()`, gabungkan foto baru, lalu `update({ vehicle_photos: updatedPhotos })`.
    - Setelah update berhasil di Supabase, panggil `onPhotoAdded(updatedSpk)` agar parent re-render tanpa menutup modal.
    - Tangani state progress (progress bar/spinner), sukses (toast), dan error (toast).
    - Di `ServiceAdvisorDashboard.tsx`, implementasikan callback `onPhotoAdded` pada `<SpkGalleryModal>` untuk meng-update state `spks` dan state `viewingGallerySpk` sehingga foto baru langsung muncul di modal.
  </action>
  <verify>npm run check</verify>
  <done>
    - Pengguna dapat memilih/meng-drop foto baru di dalam modal Galeri.
    - Foto di-compress dan di-upload ke Cloudinary.
    - Data foto (URL, public_id, dsb.) ditambahkan ke field `vehicle_photos` pada SPK yang bersangkutan di Supabase.
    - Galeri me-refresh otomatis dan menampilkan foto baru tanpa reload halaman.
  </done>
</task>

## Success Criteria
- [ ] Tersedia tombol/area upload di SpkGalleryModal.
- [ ] Proses upload tidak membebani server aplikasi (langsung dari client ke Cloudinary).
- [ ] Foto baru tersimpan di Supabase dan segera muncul di galeri.
