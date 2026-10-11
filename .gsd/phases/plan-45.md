---
phase: 45
plan: fix-kasir-bast-print
wave: 1
gap_closure: true
---

# Fix: Pembuatan Dokumen Berita Acara Serah Terima (BAST) Profesional Siap Cetak / Download PDF pada Aksi "Release Vehicle & Print BAST" di /kasir

## Problem
Saat tombol "Release Vehicle & Print BAST" diklik di `/kasir` untuk SPK yang sudah lolos QC dan lunas (misal: SPK-9846 PT WARA-WIRI), sistem saat ini hanya memunculkan browser alert teks dan memicu print seluruh layar dashboard tanpa dokumen BAST resmi. Status SPK di database juga belum otomatis diupdate menjadi COMPLETED saat penyerahan unit.

## Root Cause
1. Belum ada komponen template dokumen resmi Berita Acara Serah Terima Kendaraan (BAST) yang dirancang sesuai format dokumen legal karoseri A4 portrait.
2. Styling CSS `@media print` belum diatur untuk modal BAST, sehingga print preview mencetak seluruh tampilan dashboard gelap kasir alih-alih dokumen surat resmi bersih.
3. Handler tombol "Release Vehicle & Print BAST" di `src/pages/KasirDashboard.tsx` masih berupa mock inline alert tanpa update status SPK ke database `public.spk` dan tanpa membuka modal pratinjau dokumen BAST.

## Tasks

<task type="auto">
  <name>Komponen Dokumen & Modal BAST</name>
  <files>src/components/BastModal.tsx</files>
  <action>
  - Buat komponen `BastModal.tsx` dengan pratinjau modal interaktif dan template cetak dokumen resmi:
    a. Kop Surat RobelKaroseri: Nama bengkel, spesialisasi modifikasi/karoseri, alamat/kontak, dan garis pembatas tebal ganda/solid.
    b. Judul Dokumen: "BERITA ACARA SERAH TERIMA KENDARAAN (BAST)".
    c. Format Nomor Surat: `BAST/{spk_no}/{tahun}/{bulan}` (misal: `BAST/SPK-9846/2026/10`).
    d. Pernyataan Penyerahan Unit antara RobelKaroseri (Pihak Pertama) dan Konsumen/Perusahaan (Pihak Kedua).
    e. Tabel Spesifikasi Kendaraan:
       - Nomor SPK Induk
       - Nama Pelanggan / Perusahaan
       - Nomor Polisi Kendaraan
       - Nomor Rangka (VIN) & Nomor Mesin
    f. Status Pengujian & Keuangan:
       - Pernyataan Lulus Uji Inspeksi Akhir (Final QC Passed).
       - Pernyataan Pelunasan Tagihan Akhir (Lunas).
    g. Kolom Pengesahan Tanda Tangan (3 Kolom Sejajar):
       - Yang Menyerahkan (Kasir / RobelKaroseri)
       - Yang Menerima (Konsumen / Pemilik Kendaraan)
       - Mengetahui (Kepala Bengkel / Mandor QC)
    h. Tombol Aksi di Header/Footer Pratinjau:
       - Tombol "Cetak Dokumen / Simpan PDF" (`window.print()`).
       - Tombol "Tutup" modal.
  </action>
  <verify>Komponen BastModal dapat dirender dengan data mock/real, memformat nomor BAST dan tabel spesifikasi dengan rapi.</verify>
  <done>Komponen BastModal siap pakai dengan struktur dokumen legal lengkap.</done>
</task>

<task type="auto">
  <name>Styling CSS Cetak (@media print) Standar A4 Portrait 1 Halaman</name>
  <files>src/components/BastModal.tsx, src/index.css</files>
  <action>
  - Terapkan styling `@media print` presisi:
    - Sembunyikan elemen latar belakang gelap, backdrop modal, tombol aksi modal, navbar, dan elemen luar (`print:hidden`).
    - Atur area dokumen menjadi putih bersih (`#ffffff`), teks hitam pekat (`#000000`), border solid hitam/abu-abu tajam.
    - Konfigurasi `@page { size: A4 portrait; margin: 15mm; }`.
    - Optimalkan spasi dan ukuran font agar seluruh isi dokumen muat tepat dalam 1 lembar A4 tanpa overflow/halaman kedua kosong.
  </action>
  <verify>Saat `window.print()` dipanggil, print preview hanya menampilkan dokumen BAST A4 portrait 1 lembar bersih tanpa elemen dashboard.</verify>
  <done>Output cetak dan simpan PDF berstandar profesional A4 1 halaman.</done>
</task>

<task type="auto">
  <name>Integrasi Aksi Release Vehicle & Update Database di Kasir Dashboard</name>
  <files>src/pages/KasirDashboard.tsx</files>
  <action>
  - Pastikan query dan formatted SPK di `KasirDashboard.tsx` memuat field `vehicle_vin`, `vehicle_engine`, `vehicle_plate`, `customer_name`, `qc_status`, dsb.
  - Tambahkan state `isBastModalOpen` dan `selectedBastSpk`.
  - Hubungkan tombol "Release Vehicle & Print BAST":
    - Update kolom `status` pada tabel `public.spk` menjadi `'COMPLETED'` jika status belum 'COMPLETED'.
    - Buka `BastModal` untuk SPK yang dipilih dengan data lengkap.
    - Perbarui daftar SPK secara reaktif atau perbarui status lokal.
  </action>
  <verify>Klik tombol "Release Vehicle & Print BAST" memperbarui status SPK di database dan membuka modal BAST siap cetak.</verify>
  <done>Alur serah terima kendaraan dan cetak BAST terintegrasi menyeluruh di halaman Kasir.</done>
</task>

<task type="auto">
  <name>Verifikasi, Type Checking, dan E2E Validation</name>
  <files>None</files>
  <action>
  - Jalankan `npm run build` dan `npx oxlint` untuk memastikan build bersih dan tidak ada kesalahan tipe.
  - Uji alur pada SPK-9846: verifikasi pembukaan modal BAST, kelengkapan data VIN & mesin, dan fungsi cetak.
  - Buat commit atomik: `feat(kasir): implement professional printable vehicle handover certificate (bast)`.
  </action>
  <verify>Build passing, oxlint clean, git commit tersimpan rapi.</verify>
  <done>Seluruh persyaratan fitur BAST terpenuhi dengan bukti empiris.</done>
</task>
