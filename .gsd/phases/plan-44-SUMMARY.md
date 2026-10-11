# Summary: Penambahan Kolom qc_status & final_qc_checklist pada SPK serta Integrasi State Mandor dan Kasir

## Completed Tasks
- Dibuat dan diaplikasikan migrasi database `supabase/migrations/20261011000000_add_qc_status_and_final_checklist.sql`:
  - Menambahkan kolom `qc_status text NOT NULL DEFAULT 'PENDING' CHECK (qc_status IN ('PENDING', 'PASS', 'FAIL'))` pada tabel `public.spk`.
  - Menambahkan kolom `final_qc_checklist jsonb DEFAULT '[]'::jsonb` pada tabel `public.spk`.
  - Memperbarui RLS policy untuk mengizinkan role `mandor` dan `kasir` melakukan SELECT dan UPDATE pada tabel `public.spk`.
  - Mengupdate record pengujian `SPK-9846` menjadi `qc_status = 'PASS'`.
- Integrasi State & Hidrasi di Mandor Terminal:
  - Memperbarui tipe `Spk` di `src/types/spk.ts` dengan kolom `qc_status` dan `final_qc_checklist`.
  - Pada `src/components/QcInspectionForm.tsx`, membaca `spk.qc_status` dan `spk.final_qc_checklist` saat SPK dimuat, serta melakukan hidrasi otomatis pada 4 checkbox.
  - Pada submit Final QC, jika 4 item tercentang maka update `spk.qc_status = 'PASS'` dan simpan daftar array item ke `spk.final_qc_checklist` (jika tidak lengkap, set `FAIL`); status SPK tetap `ACTIVE` agar tidak hilang dari terminal mandor.
  - Menambahkan badge `QC PASS` pada kartu SPK di `src/pages/MandorDashboard.tsx` serta sinkronisasi callback `onQcUpdated`.
- Integrasi Kasir Dashboard:
  - Memperbarui pemetaan `qcStatus` pada `src/pages/KasirDashboard.tsx` untuk memprioritaskan kolom `d.qc_status`.
  - Gate 3 otomatis terbuka (status PASS, badge hijau) dan tombol "Generate Final Bill (Invoice)" terbuka saat `spk.qc_status === 'PASS'`.
- Verifikasi & Type Checking:
  - `npm run build` berhasil lolos tanpa error.
  - `npx oxlint` lulus dengan 0 error.
  - Pengujian end-to-end terverifikasi penuh (hidrasi 4 checkbox, parsial centang, dan Gate 3 kasir).
