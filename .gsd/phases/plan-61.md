---
phase: 61
plan: fix-replace-native-confirm-with-custom-modal-dashboard
wave: 1
gap_closure: true
---

# Fix: Mengganti Seluruh Dialog Konfirmasi Native Peramban Menjadi Modal Custom di Halaman /dashboard

## Problem
Pada halaman `/dashboard` (Owner & Admin Portal) serta submodul pengaturannya (`/admin/settings`), tindakan manajerial penting (seperti persetujuan/penolakan Change Order, pembatalan SPK langsung oleh Owner, penghapusan/penonaktifan staf pengguna, reset parameter bengkel, ekspor laporan, dan pemulihan database) masih rentan memanggil dialog bawaan peramban (`window.alert()` / `window.confirm()`) atau menggunakan modal ad-hoc yang belum terstandarisasi dengan `ConfirmationModal`.
Jika pengguna mencentang "Jangan tampilkan pesan ini lagi" pada peramban, browser akan memblokir dialog konfirmasi secara permanen sehingga tombol aksi di dashboard terhenti dan tidak dapat dieksekusi.

## Root Cause
1. `src/pages/AdminDashboardPage.tsx`: Tombol Approve dan Reject Change Order langsung mengeksekusi mutasi ke Supabase tanpa modal konfirmasi pengaman. Tabel monitoring SPK belum memiliki aksi pembatalan SPK langsung oleh Owner dengan input formal alasan pembatalan (`cancellation_reason`). Fitur reset filter dan ekspor laporan belum terlindungi modal konfirmasi formal.
2. `src/pages/AdminSettingsPage.tsx`: Terdapat 5 pemanggilan langsung `alert(...)` (notifikasi registrasi auth, pesan error pendaftaran, pesan sukses registrasi user, pesan error penyimpanan pengaturan bengkel, dan pesan sukses penyimpanan parameter). Belum ada mekanisme konfirmasi untuk penonaktifan akses staf atau pengembalian parameter operasional bengkel ke standar default.
3. `src/components/BackupRestoreCard.tsx`: Dialog konfirmasi pemulihan database menggunakan markup modal raw `div` ad-hoc alih-alih `ConfirmationModal`.

## Tasks

<task type="auto">
  <name>Task 1: Audit dan Refactor AdminDashboardPage</name>
  <files>src/pages/AdminDashboardPage.tsx</files>
  <action>
    - Integrasikan `ConfirmationModal` pada aksi Approve (`variant: 'info'`) dan Reject (`variant: 'danger'`) Change Order pada modal Pending Approvals.
    - Tambahkan tombol "Batalkan" pada baris SPK monitoring yang dapat dibatalkan (bukan CANCELLED atau COMPLETED), terhubung ke `ConfirmationModal` (`variant: 'danger'`) dengan textarea input alasan pembatalan (`cancellation_reason`). Eksekusi `spkService.cancelSpk` hanya setelah konfirmasi disetujui.
    - Tambahkan bilah pencarian dan filter status (Semua, Aktif, Menunggu QC, Overbudget, Dibatalkan), tombol Reset Filter, dan tombol Ekspor CSV dengan modal konfirmasi interaktif.
    - Sediakan modal dialog feedback terpadu (`hideCancel: true`).
  </action>
  <verify>Tidak ada pemanggilan `window.confirm` atau `window.alert` pada seluruh alur AdminDashboardPage.</verify>
  <done>AdminDashboardPage terlindungi dengan dialog konfirmasi modal kustom.</done>
</task>

<task type="auto">
  <name>Task 2: Refactor AdminSettingsPage</name>
  <files>src/pages/AdminSettingsPage.tsx</files>
  <action>
    - Hapus seluruh 5 pemanggilan `alert(...)` native.
    - Ganti dengan `ConfirmationModal` untuk feedback sukses/error pendaftaran pengguna baru dan penyimpanan konfigurasi bengkel.
    - Tambahkan aksi Aktifkan / Nonaktifkan akses staf pada tabel pengguna dengan `ConfirmationModal`.
    - Tambahkan tombol dan aksi Reset Parameter Bengkel ke Standar Pabrik dengan `ConfirmationModal` (`variant: 'warning'`).
  </action>
  <verify>Pencarian `alert(` pada `AdminSettingsPage.tsx` menghasilkan 0 kecocokan.</verify>
  <done>AdminSettingsPage bersih dari native alert/confirm dan mendukung manajemen status staf.</done>
</task>

<task type="auto">
  <name>Task 3: Refactor BackupRestoreCard</name>
  <files>src/components/BackupRestoreCard.tsx</files>
  <action>
    - Ganti markup modal raw div ad-hoc dengan komponen standar `ConfirmationModal` (`variant: 'danger'`).
    - Pastikan pesan peringatan kritis dan alur pemulihan database tetap aman dan responsif.
  </action>
  <verify>BackupRestoreCard menggunakan `ConfirmationModal` terstandarisasi.</verify>
  <done>BackupRestoreCard konsisten dengan tema dark industrial RobelKaroseri.</done>
</task>

<task type="auto">
  <name>Task 4: Penyiapan Berkas Migrasi SQL</name>
  <files>supabase/migrations/20261012000003_add_is_active_to_profiles.sql</files>
  <action>
    - Buat berkas migrasi penambahan kolom `is_active BOOLEAN NOT NULL DEFAULT true` pada tabel `public.profiles`.
    - Simpan berkas ke direktori migrasi tanpa mengeksekusi langsung ke Supabase (sesuai batasan instruksi pengguna).
  </action>
  <verify>Berkas migrasi SQL tersimpan di folder supabase/migrations/.</verify>
  <done>Skrip migrasi siap dieksekusi secara manual oleh pengguna di SQL Editor Supabase.</done>
</task>
