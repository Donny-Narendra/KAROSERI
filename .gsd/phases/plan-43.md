---
phase: 43
plan: fix-cetak-surat-tugas
wave: 1
gap_closure: true
---

# Fix: Cetak Surat Tugas SPK Borongan dengan Nomor Surat Resmi

## Problem
Tombol "Cetak" pada kartu pekerja penugasan SPK Borongan di halaman `/mandor` belum menghasilkan dokumen resmi dengan nomor surat yang tercatat di database. Dokumen penugasan borongan harus tercatat untuk validitas administrasi.

## Root Cause
Fitur pencetakan dokumen resmi dengan penomoran otomatis belum diimplementasikan, sehingga belum ada mekanisme template cetakan dan record nomor pada Supabase.

## Tasks

<task type="auto">
  <name>Skema Database Supabase</name>
  <action>
  - Buat file migrasi `supabase/migrations/20261010202000_add_assignment_letter_no.sql` untuk menambahkan kolom `assignment_letter_no text` pada tabel `public.spk_borongan`.
  - (RLS tabel `spk_borongan` sudah memiliki policy ALL untuk `mandor` dan `owner`, jadi tidak perlu penambahan policy khusus).
  - Terapkan migrasi ke database jika user belum menjalankannya.
  </action>
  <verify>Kolom `assignment_letter_no` ada di tabel `spk_borongan`.</verify>
  <done>Migrasi berhasil dijalankan dan skema termutakhir.</done>
</task>

<task type="auto">
  <name>Generator & Penyimpanan Nomor Surat Tugas</name>
  <action>
  Pada handler aksi tombol "Cetak" di modal SPK Borongan (misalnya pada komponen `SpkBoronganList` atau `WbsChecklist`):
  - Periksa apakah record `spk_borongan` terkait sudah memiliki `assignment_letter_no`.
  - Jika belum ada, buat nomor surat tugas otomatis. Format: `ST-BORONG/{spk_no}/{wbs_code}/{counter}` (Contoh: `ST-BORONG/SPK-9846/WBS-1/01`). Untuk counter, bisa gunakan id increment atau index urutan borongan.
  - Lakukan update ke Supabase: `UPDATE spk_borongan SET assignment_letter_no = ... WHERE id = ...`.
  - Gunakan nomor surat tersebut untuk ditampilkan pada template cetak.
  </action>
  <verify>Nomor surat ter-generate dengan format yang benar dan tersimpan di database sebelum proses render/cetak.</verify>
  <done>Nomor surat konsisten (tidak berubah) setiap kali dicetak ulang untuk ID yang sama.</done>
</task>

<task type="auto">
  <name>Desain Template Dokumen Cetak</name>
  <action>
  Implementasikan Print View / Window Print (bisa menggunakan modal khusus cetak atau window.print() dengan CSS `@media print`) pada halaman Mandor:
  - Header: Kop Bengkel "RobelKaroseri" & Judul "SURAT TUGAS PENGERJAAN BORONGAN".
  - Nomor Surat: "Nomor: {assignment_letter_no}"
  - Dasar Penugasan:
    - Nomor SPK Induk: {spk.spk_no}
    - Pelanggan: {spk.customer_name}
    - Kendaraan: {spk.license_plate || '-'} ({spk.vehicle_model || '-'})
    - Tahapan WBS: {wbs_category}
  - Detail Instruksi & Penugasan:
    - Nama Pekerja: {worker_name}
    - Uraian Tugas: {task_description}
  - Bagian Pengesahan / Tanda Tangan:
    - Tanda tangan Mandor / Kepala Bengkel (Pemberi Tugas).
    - Tanda tangan Pekerja / Mandor Borong (Penerima Tugas).
  - Pastikan styling `@media print` rapi, bersih, berorientasi kertas A4 / Letter portrait, dan menyembunyikan elemen navigasi aplikasi.
  </action>
  <verify>Tampilan cetak sesuai spesifikasi, rapi saat di print preview, dan tidak ada elemen aplikasi (sidebar/header) yang ikut tercetak.</verify>
  <done>Print view sesuai desain.</done>
</task>

<task type="auto">
  <name>Verifikasi & Type Checking</name>
  <action>
  - Jalankan `npm run build` dan `npx oxlint` untuk memastikan tidak ada kesalahan build atau tipe data pada komponen Mandor.
  </action>
  <verify>Build berhasil, linter clean.</verify>
  <done>Tidak ada error lint atau type checking.</done>
</task>
