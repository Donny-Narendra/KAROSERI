---
phase: 27
plan: 1
wave: 1
---

# Plan 27.1: Implementasi Tombol Aksi dan Modal Pratinjau "Galeri Foto 360°"

## Objective
Mengimplementasikan tombol aksi (ikon kamera) dan modal pop-up pratinjau "Galeri Foto 360°" pada tabel Recent SPK di halaman portal Service Advisor. Hal ini akan memudahkan inspeksi kondisi awal kendaraan dengan dukungan kompresi on-the-fly via Cloudinary CDN dan mode Lightbox.

## Context
- `.gsd/SPEC.md`
- `.gsd/ROADMAP.md`
- `src/pages/ServiceAdvisorDashboard.tsx`
- `src/components/spk/VehicleGallery.tsx`

## Tasks

<task type="auto">
  <name>Implementasi Modal Galeri Foto dan Mode Lightbox</name>
  <files>
    - `src/components/spk/SpkGalleryModal.tsx` (komponen baru)
  </files>
  <action>
    - Buat komponen `SpkGalleryModal` yang bertugas sebagai modal overlay.
    - Props yang dibutuhkan: `isOpen`, `onClose`, `spk` (berisi data spk_no, vehicle_plate, customer_name, vehicle_photos).
    - Tampilkan header berisi informasi SPK.
    - Jika `vehicle_photos` kosong atau null, tampilkan empty state yang ramah.
    - Jika ada, render thumbnail galeri menggunakan fungsi `getOptimizedImageUrl`.
    - Terapkan mode Lightbox: apabila salah satu thumbnail diklik, tampilkan modal lapis kedua atau ubah tampilan modal menjadi penampil layar penuh (fullscreen view) untuk gambar tersebut dengan tombol close (X).
  </action>
  <verify>
    Pastikan file di-compile tanpa error TS dan tidak ada module yang hilang.
  </verify>
  <done>
    Komponen modal Galeri lengkap dengan Lightbox selesai dibuat.
  </done>
</task>

<task type="auto">
  <name>Integrasi Tombol Aksi di Dasbor Service Advisor</name>
  <files>
    - `src/pages/ServiceAdvisorDashboard.tsx`
  </files>
  <action>
    - Tambahkan state `viewingGallerySpk` (tipe objek SPK atau null) untuk mengontrol visibilitas modal galeri.
    - Pada tabel Recent SPK (bagian JSX render baris), tambahkan sebuah tombol dengan ikon Kamera (dari lucide-react) sebelum tombol "Manage" atau di kolom Action.
    - Beri logika: `disabled={!spk.vehicle_photos || spk.vehicle_photos.length === 0}`.
    - Tambahkan atribut `title` atau tooltip sederhana: "Lihat Foto 360°" (jika aktif) atau "Belum ada foto" (jika disabled).
    - Sisipkan komponen `<SpkGalleryModal>` di bawah form atau di akhir main JSX, passing state yang relevan.
  </action>
  <verify>
    Periksa dengan perintah lint bahwa semua import (termasuk icon Kamera dan komponen modal) dideklarasikan dengan benar.
  </verify>
  <done>
    Tombol aksi terintegrasi, fungsionalitas memunculkan modal berjalan mulus.
  </done>
</task>

## Success Criteria
- [ ] Tombol ikon Kamera muncul di setiap baris tabel Recent SPK di portal Service Advisor.
- [ ] Tombol dinonaktifkan (disabled) secara otomatis jika SPK tidak memiliki foto (array kosong atau null).
- [ ] Modal menampilkan header dengan rincian singkat SPK dan menyajikan gambar secara grid.
- [ ] Fitur Lightbox dapat membuka gambar dalam mode besar saat salah satu foto diklik.
- [ ] Gambar dimuat langsung dari URL Cloudinary menggunakan optimisasi bawaan.
