---
phase: 52
plan: fix-exclude-used-items-from-rab-panel
wave: 1
gap_closure: true
---

# Fix: Eksklusi Material yang Sudah Digunakan (di Minta Material maupun SPK Borongan) dari Panel Alokasi RAB pada /mandor

## Problem
Pada modal "Minta Material (Requisition)" (`src/components/MaterialRequisitionForm.tsx`) untuk tahapan WBS aktif (misal: Sasis/Rangka), panel kanan "Alokasi RAB (WBS Terkait)" saat ini masih menampilkan seluruh item yang direncanakan di RAB.
1. Item yang sudah pernah diajukan pada "Daftar Permintaan Material" (Material Requisitions) untuk SPK & WBS tersebut masih muncul kembali di panel Alokasi RAB jika modal dibuka ulang.
2. Item pekerjaan/material yang sudah ditugaskan ke pekerja borongan pada modul "SPK Borongan" (SPK-B) untuk SPK & WBS tersebut tetap tercantum di panel Alokasi RAB.
Hal ini berisiko menyebabkan mandor menduplikasi permintaan material ke logistik gudang atau meminta material yang sebenarnya sudah didelegasikan sebagai pekerjaan borongan.

## Root Cause
Komponen `MaterialRequisitionForm.tsx` hanya mengambil data mentah dari `rab_items` untuk WBS aktif tanpa melakukan cross-query ke tabel `material_requisitions`/`material_requisition_items` (permintaan tersimpan) dan tabel `spk_borongan` (penugasan borongan aktif). Filter panel kanan saat ini hanya mengecualikan item yang sedang berada di daftar sementara (`selectedItems`) dalam satu sesi modal, bukan data riil yang sudah tersimpan di database.

## Tasks

<task type="auto">
  <name>Task 1: Kueri Data Pembanding Cross-Module (Requisitions & SPK Borongan) di MaterialRequisitionForm</name>
  <files>src/components/MaterialRequisitionForm.tsx</files>
  <action>
    1. Tambahkan pengambilan data Requisition tersimpan dari Supabase:
       - Query tabel `material_requisitions` dan `material_requisition_items` dengan kriteria `spk_id = spkId`, `wbs_category = cleanWbsCategory`, dan `status != 'REJECTED'`.
       - Himpun ID material (`material_id`) yang sudah pernah diminta ke gudang ke dalam `Set<string>`.
    2. Tambahkan pengambilan data penugasan borongan aktif dari Supabase:
       - Query tabel `spk_borongan` dengan kriteria `spk_id = spkId`, `wbs_category = cleanWbsCategory`, dan `status != 'CUT_OFF'` (atau `status === 'ACTIVE'`).
       - Simpan daftar penugasan aktif (berisi `material_id` dan `task_description`) untuk dicocokkan dengan item RAB.
    3. Simpan data pembanding ini ke dalam state komponen atau proses saat `loadInitialData`.
  </action>
  <verify>Data riwayat Requisition dan data aktif SPK-B berhasil dimuat secara asynchronous tanpa error saat modal dibuka.</verify>
  <done>Kueri data pembanding cross-module berhasil diimplementasikan.</done>
</task>

<task type="auto">
  <name>Task 2: Logika Pemfilteran Panel Alokasi RAB dan Sinkronisasi Badge & Indikator Sisa</name>
  <files>src/components/MaterialRequisitionForm.tsx</files>
  <action>
    1. Terapkan logika pemfilteran pada `rab_items` saat inisialisasi / memoized:
       - Eksklusi item yang ID-nya atau `material_id`-nya sudah tercatat di Requisitions tersimpan (`usedRequisitionMaterialIds`).
       - Eksklusi item yang sedang berada di daftar permintaan sementara (`selectedItems`).
       - Eksklusi item yang sudah ditugaskan di SPK Borongan aktif:
         * Cocokkan via `material_id`, ATAU
         * Cocokkan via `task_description` dengan nama material (`materials.name` atau `item.description`).
    2. Pastikan daftar `availableItems` di panel kanan hanya menampung item yang benar-benar belum digunakan.
    3. Perbarui counter badge header panel kanan (`Alokasi RAB (WBS Terkait)`) dan label footer (`{availableItems.length} item tersisa`) agar sinkron dan akurat.
    4. Pastikan pemindahan item dua arah (tambah ke permintaan / kembalikan ke RAB) tetap bekerja konsisten tanpa mengembalikan item yang sudah terpakai di database.
  </action>
  <verify>Item yang sudah ada di SPK Borongan atau sudah diajukan via Requisition sebelumnya tidak lagi muncul di panel kanan Alokasi RAB.</verify>
  <done>Logika filter dan sinkronisasi badge/footer berfungsi sempurna.</done>
</task>

<task type="auto">
  <name>Task 3: Verifikasi Linting, Type Checking, Build, dan Commit Atomik</name>
  <files>src/components/MaterialRequisitionForm.tsx</files>
  <action>
    1. Jalankan `npx oxlint` untuk memastikan kepatuhan linting tanpa error.
    2. Jalankan `npm run build` untuk memverifikasi type-checking TypeScript dan integritas build Vite.
    3. Lakukan pengujian skenario:
       a. Pekerjaan yang ditugaskan di SPK Borongan lenyap dari panel kanan Alokasi RAB.
       b. Item yang disubmit di Permintaan Material lenyap dari panel kanan Alokasi RAB saat modal dibuka kembali.
    4. Buat commit atomik: `fix(mandor): exclude items used in requisitions and spk borongan from rab allocation panel`.
  </action>
  <verify>`npx oxlint` dan `npm run build` exit code 0 tanpa error.</verify>
  <done>Verifikasi tuntas dan commit atomik tersimpan di git.</done>
</task>
