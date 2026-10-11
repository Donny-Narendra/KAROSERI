---
phase: 59
plan: fix-replace-native-confirm-with-custom-modal-kasir
wave: 1
gap_closure: true
---

# Fix: Mengganti Seluruh Dialog Konfirmasi Native Peramban Menjadi Modal Custom di Halaman /kasir

## Problem
Pada halaman `/kasir` (Billing & Pelunasan Akhir), tindakan transaksi sensitif (seperti konfirmasi penerbitan faktur/Generate Final Bill, pelunasan tagihan/Mark as Paid, pembatalan invoice yang belum terbayar, serah terima unit kendaraan/BAST, penerimaan uang muka/DP, dan penyalinan tautan pelacakan) masih berpotensi memanggil fungsi dialog bawaan peramban (`window.confirm()` atau `window.alert()`).
Jika pengguna memilih opsi peramban "Jangan tampilkan pesan ini lagi" (*Prevent this page from creating additional dialogs*), browser akan membungkam dialog seterusnya sehingga alur kasir terhambat total.

## Root Cause
1. Pemanggilan native `alert(...)` pada `KasirDashboard.tsx` untuk notifikasi pembuatan invoice, pelunasan pembayaran, error serah terima kendaraan BAST, dan penyalinan URL pelacakan. Belum tersedianya modal konfirmasi terstruktur sebelum eksekusi Generate Final Bill, Mark as Paid, dan Release Vehicle.
2. Form `DownPaymentModal.tsx` menggunakan `alert(...)` untuk validasi nominal dan status keberhasilan/kegagalan transaksi DP, serta belum memiliki dialog konfirmasi prasyarat aktivasi SPK.
3. Komponen `DpHistoryList.tsx` memanggil `alert(...)` native sebelum `window.print()`.
4. Komponen `BastModal.tsx` memanggil `alert(...)` ketika terjadi kegagalan pembuatan berkas PDF.
5. Tabel `invoices` pada skema Supabase memiliki check constraint `CHECK (status IN ('DRAFT', 'UNPAID', 'LUNAS'))` yang memerlukan migrasi opsional jika pembatalan invoice memanfaatkan status `'CANCELLED'`.

## Tasks

<task type="auto">
  <name>Task 1: Refactor KasirDashboard ke ConfirmationModal</name>
  <files>src/pages/KasirDashboard.tsx</files>
  <action>
    - Hubungkan `ConfirmationModal` untuk:
      a. Konfirmasi sebelum "Generate Final Bill (Invoice)" dengan rincian biaya, penyesuaian manual, dan pemotongan DP.
      b. Konfirmasi sebelum "Mark as Paid" (Pelunasan Akhir).
      c. Konfirmasi pembatalan invoice yang belum terbayar ("Batalkan Invoice").
      d. Konfirmasi sebelum "Release Vehicle & Print BAST".
    - Ganti seluruh `alert(...)` (sukses, validasi, salin tautan, dan error) dengan modal custom (`hideCancel: true`).
    - Pastikan eksekusi Supabase hanya berjalan setelah pengguna menekan konfirmasi di modal.
  </action>
  <verify>Tidak ada pemanggilan alert atau window.confirm di KasirDashboard.tsx.</verify>
  <done>KasirDashboard sepenuhnya menggunakan ConfirmationModal state-driven.</done>
</task>

<task type="auto">
  <name>Task 2: Refactor DownPaymentModal ke ConfirmationModal</name>
  <files>src/components/DownPaymentModal.tsx</files>
  <action>
    - Tambahkan modal konfirmasi prasyarat sebelum mencatat penerimaan DP dan mengaktifkan SPK.
    - Ganti seluruh `alert(...)` (validasi nominal, sukses pencatatan DP, dan error Supabase) dengan modal dialog custom.
    - Pastikan integrasi form berjalan mulus dan tetap responsif.
  </action>
  <verify>Tidak ada pemanggilan alert di DownPaymentModal.tsx.</verify>
  <done>DownPaymentModal sepenuhnya menggunakan ConfirmationModal.</done>
</task>

<task type="auto">
  <name>Task 3: Refactor DpHistoryList dan BastModal ke Modal Dialog Custom</name>
  <files>src/components/DpHistoryList.tsx, src/components/BastModal.tsx</files>
  <action>
    - Ganti `alert(...)` pada `handlePrintReceipt` di `DpHistoryList.tsx` dengan modal konfirmasi persiapan cetak kuitansi DP.
    - Ganti `alert(...)` saat error PDF di `BastModal.tsx` dengan modal notifikasi custom.
  </action>
  <verify>Tidak ada alert di DpHistoryList.tsx dan BastModal.tsx.</verify>
  <done>DpHistoryList dan BastModal terstandarisasi tanpa dialog native.</done>
</task>

<task type="auto">
  <name>Task 4: Siapkan Berkas Migrasi SQL untuk Status Invoices</name>
  <files>supabase/migrations/20261012000002_add_cancelled_to_invoices_status.sql</files>
  <action>
    - Tuliskan skrip SQL untuk menambahkan nilai status 'CANCELLED' pada tabel invoices secara aman.
    - Jangan mengeksekusi skrip secara otomatis ke Supabase (manual execution oleh pengguna).
  </action>
  <verify>Berkas migrasi SQL tersimpan di supabase/migrations/.</verify>
  <done>Skrip migrasi tersedia untuk eksekusi manual di SQL Editor Supabase.</done>
</task>
