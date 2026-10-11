---
phase: 44
plan: fix-qc-status-hydration
wave: 1
gap_closure: true
---

# Fix: Penambahan Kolom qc_status & final_qc_checklist pada SPK serta Integrasi State Mandor dan Kasir

## Problem
Pada tabel `public.spk`, kolom `qc_status` belum ada (ERROR 42703: column "qc_status" does not exist). Hal ini menyebabkan submit Final QC di `/mandor` tidak tersimpan ke database dan status di `/kasir` terus terkunci Gate 3 (QC Pending/Failed).

## Root Cause
1. Kolom `qc_status` dan `final_qc_checklist` belum didefinisikan pada tabel `public.spk`.
2. Role `mandor` belum memiliki hak UPDATE pada tabel `public.spk` di RLS.
3. Form `QcInspectionForm` di Mandor Terminal belum membaca `spk.qc_status` dan `spk.final_qc_checklist` untuk hidrasi state checklist saat SPK dipilih, serta belum melakukan update ke kolom tersebut pada `public.spk`.
4. Halaman Kasir (`KasirDashboard`) mengandalkan relasi `qc_inspections` lama daripada kolom `spk.qc_status`.

## Tasks

<task type="auto">
  <name>Migrasi Skema Database & RLS</name>
  <files>supabase/migrations/20261011000000_add_qc_status_and_final_checklist.sql</files>
  <action>
  - Tambahkan kolom `qc_status text NOT NULL DEFAULT 'PENDING' CHECK (qc_status IN ('PENDING', 'PASS', 'FAIL'))` pada tabel `public.spk`.
  - Tambahkan kolom `final_qc_checklist jsonb DEFAULT '[]'::jsonb` pada tabel `public.spk`.
  - Konfigurasi RLS policy agar role `mandor` dan `kasir` dapat membaca (SELECT) dan memperbarui (UPDATE) tabel `public.spk`.
  - Terapkan migrasi ke database.
  </action>
  <verify>Kolom `qc_status` dan `final_qc_checklist` terdaftar di information_schema.columns tabel `spk`, RLS policies aktif.</verify>
  <done>Database siap menerima dan menyimpan status QC serta array checklist.</done>
</task>

<task type="auto">
  <name>Integrasi State & Hidrasi di Halaman Mandor</name>
  <files>src/components/QcInspectionForm.tsx, src/types/spk.ts, src/pages/MandorDashboard.tsx</files>
  <action>
  - Perbarui tipe `Spk` pada `src/types/spk.ts` untuk menyertakan `qc_status?: 'PENDING' | 'PASS' | 'FAIL'` dan `final_qc_checklist?: string[]`.
  - Pada `QcInspectionForm.tsx`:
    - Saat SPK dipilih (spkId berubah), baca `status, qc_status, final_qc_checklist` dari tabel `spk`.
    - Lakukan hidrasi otomatis pada state checkbox berdasarkan item yang tersimpan di `final_qc_checklist`.
    - Pada aksi submit: jika 4 item tercentang, set `spk.qc_status = 'PASS'` dan simpan daftar array item yang tercentang ke `spk.final_qc_checklist`; jika belum lengkap, set `spk.qc_status = 'FAIL'` (atau 'PENDING').
    - Pertahankan logging histori inspeksi ke `qc_inspections`.
  </action>
  <verify>Checkbox terhidrasi otomatis saat SPK dimuat, dan hasil submit tersimpan ke database.</verify>
  <done>Mandor Terminal menyimpan data QC dan mempertahankan centang saat refresh.</done>
</task>

<task type="auto">
  <name>Integrasi Halaman Kasir (Gate 3 Unlocking)</name>
  <files>src/pages/KasirDashboard.tsx</files>
  <action>
  - Pastikan query billing pada `fetchSpks` membaca kolom `spk.qc_status`.
  - Format status QC dengan prioritas pada `d.qc_status`.
  - Pastikan Gate 3 terbuka (status PASS, hijau) dan tombol "Generate Final Bill (Invoice)" aktif hanya ketika `selectedSpk.qcStatus === 'PASS'`.
  </action>
  <verify>SPK dengan `qc_status = 'PASS'` menampilkan Gate 3 Passed dan tombol invoice aktif.</verify>
  <done>Kasir Dashboard tidak lagi terkunci secara salah.</done>
</task>

<task type="auto">
  <name>Verifikasi & Type Checking</name>
  <files>None</files>
  <action>
  - Jalankan `npm run build` dan `npx oxlint` untuk memastikan zero type error dan linter clean.
  - Uji alur end-to-end secara fungsional.
  - Buat commit atomik: `fix(qc): add qc_status and final_qc_checklist columns to spk and bind hydration in mandor and kasir`.
  </action>
  <verify>Build passing, oxlint clean, git commit tersimpan rapi.</verify>
  <done>Seluruh kriteria verifikasi terpenuhi.</done>
</task>
