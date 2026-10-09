---
phase: 33
plan: tracking-pdf-export
wave: 1
gap_closure: true
---

# Fix: Portal Publik Laporan Progres Pengerjaan Unit via Nomor Rangka & Generator PDF Progres

## Problem
Konsumen tidak memiliki akses mandiri (tanpa login) untuk melacak status pengerjaan kendaraan mereka. Tidak adanya pelacakan mandiri mengharuskan pelanggan menanyakan progres secara manual ke kasir atau admin, menambah beban operasional. Laporan PDF yang rapi juga dibutuhkan sebagai laporan resmi untuk pelanggan.

## Root Cause
Sistem saat ini hanya diperuntukkan bagi pengguna internal (mandor, owner, kasir, admin). Tidak ada route (endpoint) UI publik yang mengekspos data WBS (Checklist dan Aset/Foto) berdasarkan Nomor Rangka/VIN.

## Tasks

<task type="auto">
  <name>Pembuatan Halaman & Route Tracking Publik</name>
  <files>src/App.tsx, src/pages/PublicProgressTracking.tsx</files>
  <action>Buat komponen/halaman baru `PublicProgressTracking` yang bisa diakses tanpa login. Daftarkan di route `/tracking/:vin`. Komponen harus melakukan query data SPK, checklist WBS, dan Aset WBS berdasarkan `vehicle_vin` dan merendernya dalam tampilan rapi.</action>
  <verify>Halaman tracking bisa diakses tanpa otentikasi. Data yang muncul valid sesuai `vehicle_vin`. Jika VIN salah/SPK status DRAFT/belum DP, tampilkan pesan error yang jelas (Not Found / Belum Tersedia).</verify>
</task>

<task type="auto">
  <name>Mekanisme Rate Limiting Akses & Download (LocalStorage)</name>
  <files>src/pages/PublicProgressTracking.tsx</files>
  <action>Tambahkan simple rate limit menggunakan `localStorage` dengan key `tracking_limit_{vin}_{date}`. Jika jumlah akses (atau view) >= 5, blokir halaman dengan peringatan: "Batas akses harian untuk nomor rangka ini telah tercapai".</action>
  <verify>Membuka halaman lebih dari 5 kali di hari yang sama akan menampilkan peringatan dan mencegah query ke Supabase/rendering WBS.</verify>
</task>

<task type="auto">
  <name>Modul Generator Cetak PDF Laporan Progres</name>
  <files>src/components/ProgressPdfGenerator.tsx (atau utilitas sejenis), src/pages/PublicProgressTracking.tsx</files>
  <action>Buat fungsi cetak PDF (bisa menggunakan `html2pdf.js` atau window.print() styling, atau modul khusus). PDF harus memuat Header, Overall Progress Bar, Daftar WBS, dan Galeri Foto (dalam grid 3 kolom per baris).</action>
  <verify>Tombol "Unduh Laporan PDF" menghasilkan PDF yang memuat semua informasi SPK, WBS Checklist, dan 3 kolom gambar.</verify>
</task>

<task type="auto">
  <name>Integrasi Halaman Kasir (Tombol Salin Tautan Pelacakan)</name>
  <files>src/pages/KasirDashboard.tsx</files>
  <action>Pada SPK List di Kasir, jika status bukan DRAFT, tambahkan opsi aksi "Salin Link Lacak" yang akan menyalin URL `https://{hostname}/tracking/{spk.vehicle_vin}` ke clipboard.</action>
  <verify>Kasir bisa dengan mudah menyalin link pelacakan jika sudah ada Nomor Rangka (VIN).</verify>
</task>
