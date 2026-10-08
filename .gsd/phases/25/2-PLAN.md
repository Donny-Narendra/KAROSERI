---
phase: 25
plan: 2
wave: 2
---

# Plan 25.2: UI Dashboard Owner Backup & Restore

## Objective
Membuat antarmuka (UI) manajemen data di Dashboard Owner yang terhubung dengan endpoint Backup & Restore, serta menampilkan peringatan risiko sebelum pemulihan database.

## Context
- Kebutuhan teknis UI berdasarkan requirement: Tombol Unduh dan Form Upload Restore.
- File target: `src/pages/OwnerDashboard.tsx` (atau komponen setara untuk role owner).

## Tasks

<task type="auto">
  <name>Komponen UI Backup & Restore di Owner Dashboard</name>
  <files>
    src/pages/OwnerDashboard.tsx
    src/components/BackupRestoreCard.tsx
  </files>
  <action>
    - Buat komponen baru `BackupRestoreCard.tsx`.
    - Tambahkan UI Card "Manajemen Data" dengan tombol "Unduh Backup (.sql.gz)".
    - Tombol Unduh harus menampilkan indikator loading spinner saat data sedang didownload dari endpoint `/backup`.
    - Tambahkan Form File Upload atau tombol "Restore Database" yang menerima input tipe berkas `.sql.gz`.
    - Saat file di-submit, munculkan Modal Konfirmasi (menggunakan komponen Modal yang ada) dengan pesan: "PERINGATAN: Memulihkan database akan menimpa data yang ada saat ini".
    - Jika Owner menekan tombol Lanjutkan/Setuju di Modal, upload formData ke endpoint `/restore` dengan progress/loading state.
    - Pasang komponen `BackupRestoreCard` ini ke halaman `OwnerDashboard.tsx`.
    - Tampilkan Toast/Notifikasi sukses atau gagal setelah proses selesai.
  </action>
  <verify>npm run lint && npm run build</verify>
  <done>UI BackupRestoreCard tampil di Dashboard Owner, tombol Unduh dapat diklik (memicu loading), dan tombol Restore memicu Modal Peringatan.</done>
</task>
