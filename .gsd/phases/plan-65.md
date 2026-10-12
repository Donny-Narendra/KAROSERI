---
phase: 65
plan: fix-sync-requisitions-rls-service-advisor
wave: 1
gap_closure: true
---

# Fix: Sinkronisasi Tampilan Data Requisition Lintas Role dan Resolusi Pelanggaran RLS Minta Material untuk Service Advisor

## Problem
1. Pelanggaran RLS INSERT:
   Ketika akun dengan role `service_advisor` membuka modal "Minta Material (Requisition)" (misal: WBS Pembongkaran pada SPK-1452) lalu memindahkan material dan mengklik "Submit Requisition", muncul error merah:
   "new row violates row-level security policy for table 'material_requisitions'".
   Hal ini terjadi karena tabel `material_requisitions` dan `material_requisition_items` belum mengizinkan peran `service_advisor` pada policy INSERT di Supabase.
2. Desinkronisasi Tampilan Antara Mandor dan Service Advisor:
   Jika material telah diajukan oleh Mandor, data tersebut tampil di sisi Mandor dengan badge TERCATAT. Namun ketika WBS yang sama dibuka oleh Service Advisor, material yang telah diminta tersebut masih muncul di panel kanan "Alokasi RAB (WBS Terkait)" seakan-akan belum diminta.
   Akar Masalah: Policy `SELECT` pada tabel requisition membatasi pembacaan data, atau kueri pembacaan requisition di halaman Service Advisor tidak mengambil seluruh permintaan aktif dari SPK dan WBS terkait.

## Root Cause
1. Policy RLS Supabase pada `public.material_requisitions` dan `public.material_requisition_items` sebelumnya hanya mengizinkan role `owner`, `mandor`, dan `petugas_gudang`, mengecualikan peran `service_advisor` dan `admin`.
2. Kueri pembacaan data requisition aktif belum mengecualikan status `CANCELLED` secara eksplisit, dan membutuhkan penanganan toleransi nama kategori WBS serta penanganan error pembacaan yang transparan.
3. Pemetaan `material_id` saat submit requisition perlu memastikan referensi foreign key UUID ke tabel `materials` master catalog tetap terjaga.
4. Teks pesan kotak kanan saat seluruh item RAB telah dipindahkan perlu disinkronkan secara konsisten.

## Tasks

<task type="auto">
  <name>Task 1: Pembuatan File Migrasi SQL RLS Requisitions</name>
  <files>supabase/migrations/20261012_sync_requisitions_rls_for_service_advisor.sql</files>
  <action>
    - Tulis skrip DDL SQL lengkap yang memperbarui RLS policy pada tabel `public.material_requisitions` dan `public.material_requisition_items`.
    - Bersihkan policy lama (Owners, Mandor, Gudang) untuk mencegah konflik atau filter restriktif.
    - Berikan izin SELECT, INSERT, UPDATE, dan DELETE untuk role `service_advisor`, `mandor`, `petugas_gudang`, `owner`, dan `admin`.
    - Gunakan dual-check: klaim JWT (`auth.jwt() ->> 'role'`) dan tabel profil pengguna (`profiles.role`).
    - Pastikan SELECT bersifat terbuka bagi seluruh staf berwenang membaca requisition berdasarkan SPK dan WBS (tanpa filter sepihak created_by = auth.uid()).
  </action>
  <verify>Berkas migrasi SQL tersimpan di path yang ditentukan dan siap dieksekusi secara manual oleh pengguna di Supabase SQL Editor.</verify>
  <done>Migrasi SQL RLS requisition untuk Service Advisor selesai dibuat.</done>
</task>

<task type="auto">
  <name>Task 2: Sinkronisasi Frontend MaterialRequisitionForm dan SpkBoronganPanel</name>
  <files>src/components/MaterialRequisitionForm.tsx, src/components/SpkBoronganPanel.tsx</files>
  <action>
    - Perbarui kueri Supabase pada `loadInitialData` di `MaterialRequisitionForm.tsx` untuk mengambil seluruh requisition aktif dengan menyaring `.neq('status', 'CANCELLED').neq('status', 'REJECTED')`.
    - Tambahkan toleransi pencocokan kategori WBS menggunakan `normalizeText`.
    - Pastikan rendering kotak kiri menampilkan seluruh item tersimpan lengkap dengan nama, kuantitas, dan badge status `TERCATAT`.
    - Sinkronkan panel kanan agar mengecualikan material yang sudah diajukan di requisition atau ditugaskan di SPK Borongan, serta menampilkan pesan informatif ketika semua material telah dipindahkan.
    - Tambahkan resolusi defensif `material_id` dari master catalog pada payload `handleSubmit` sebelum dikirim ke Supabase.
    - Perbarui filter exclusion requisition pada `SpkBoronganPanel.tsx` agar konsisten mengecualikan status CANCELLED.
  </action>
  <verify>Komponen me-render data permintaan aktif secara sinkron lintas role dan submit payload memenuhi validasi RLS.</verify>
  <done>Logika kueri dan tampilan frontend tersinkronisasi sempurna.</done>
</task>
