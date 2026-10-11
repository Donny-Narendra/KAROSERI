---
phase: 53
plan: fix-sync-mutual-exclusion-requisition-spk-borongan
wave: 1
gap_closure: true
---

# Fix: Sinkronisasi Mutual Exclusion Material Antara Requisition dan SPK Borongan di Mandor

## Problem
Pada halaman `/mandor`, material "TUKANG LAS DUDUKAN SLEBOR" yang sudah ditugaskan di modul "SPK Borongan" (Riwayat Penugasan SPK-B: "TUKANG LAS DUDUKAN SLEBOR melepas baut yang doll") masih muncul di panel "Alokasi RAB (WBS Terkait)" pada modal "Minta Material (Requisition)".
Sebaliknya, material yang sudah diajukan di salah satu tempat harus langsung hilang dari kedua tempat (baik di SPK Borongan maupun di Minta Material).

## Root Cause
1. `spk_borongan.task_description` seringkali memuat teks tambahan atau catatan pengerjaan dari mandor (misal: "TUKANG LAS DUDUKAN SLEBOR melepas baut yang doll"), sehingga perbandingan string langsung secara strict equality (`===`) dengan nama material pada item RAB gagal mengecualikan item.
2. Ketika penugasan SPK Borongan dibuat melalui transfer item RAB di antarmuka, `material_id` / `rab_item_id` belum tersimpan secara eksplisit ke database atau record `spk_borongan`.
3. Filter eksklusi di kedua modal (`MaterialRequisitionForm.tsx` dan `SpkBoronganPanel.tsx`) belum terstandardisasi dalam fungsi shared availability filter dengan toleransi substring / normalisasi teks dan pencocokan ID ganda.

## Tasks

<task type="auto">
  <name>Task 1: Skema / Data Tracking Penggunaan Item pada SPK Borongan</name>
  <files>supabase/migrations/20261011201500_add_material_tracking_to_spk_borongan.sql, src/components/SpkBoronganPanel.tsx</files>
  <action>
    1. Buat file migrasi SQL `supabase/migrations/20261011201500_add_material_tracking_to_spk_borongan.sql`:
       - `ALTER TABLE public.spk_borongan ADD COLUMN IF NOT EXISTS material_id uuid REFERENCES public.materials(id);`
       - `ALTER TABLE public.spk_borongan ADD COLUMN IF NOT EXISTS rab_item_id uuid REFERENCES public.rab_items(id);`
       - Terapkan migrasi ke database menggunakan `node apply_migration.cjs`.
    2. Pada `src/components/SpkBoronganPanel.tsx`:
       - Perbarui interface `SpkBorongan` untuk menyertakan `material_id?: string;` dan `rab_item_id?: string;`.
       - Pada fungsi `handleCreate`, jika penugasan dibuat dari item RAB (`selectedRabItemForAssignment`), simpan juga `material_id` dan `rab_item_id` ke record `spk_borongan`.
  </action>
  <verify>Kolom database berhasil ditambahkan dan penugasan SPK Borongan baru dari item RAB menyimpan referensi material_id / rab_item_id.</verify>
  <done>Skema dan data tracking penggunaan item RAB pada SPK Borongan terhubung dengan rapi.</done>
</task>

<task type="auto">
  <name>Task 2: Pembuatan Utilitas Shared Availability Filter (isRabItemAllocated)</name>
  <files>src/utils/rabItemAllocation.ts</files>
  <action>
    1. Buat file utilitas `src/utils/rabItemAllocation.ts`.
    2. Implementasikan fungsi `isRabItemAllocated(rabItem, requisitions, assignments)`:
       - Ekstrak nama item (`itemName`) dan ID material (`materialId`).
       - Cek ketersediaan di Requisitions: kecualikan status CANCELLED / REJECTED; cocokkan `materialId` serta periksa kesesuaian nama (nama sama atau saling memuat substring case-insensitive).
       - Cek ketersediaan di SPK Borongan: kecualikan status CANCELLED / CUT_OFF; cocokkan `materialId` serta periksa apakah `task_description` memuat nama material atau sebaliknya (case-insensitive substring match).
    3. Pastikan fungsi aman dari nilai undefined/null dan menangani berbagai bentuk struktur item RAB.
  </action>
  <verify>Fungsi `isRabItemAllocated` mengembalikan `true` jika item RAB sudah tercatat di Requisition atau SPK Borongan aktif, termasuk pada kasus deskripsi tugas dengan teks tambahan.</verify>
  <done>Fungsi utilitas `isRabItemAllocated` berhasil dibuat dan siap dipakai bersama.</done>
</task>

<task type="auto">
  <name>Task 3: Terapkan Shared Availability Filter di Kedua Modal (/mandor)</name>
  <files>src/components/MaterialRequisitionForm.tsx, src/components/SpkBoronganPanel.tsx</files>
  <action>
    1. Pada `src/components/MaterialRequisitionForm.tsx`:
       - Impor `isRabItemAllocated` dari `../utils/rabItemAllocation`.
       - Gunakan `isRabItemAllocated` dalam `useMemo` penentu `availableItems` dengan menyertakan requisition tersimpan, requisition lokal sementara (`selectedItems`), dan penugasan borongan aktif (`activeSpkBoronganList`).
       - Sinkronkan badge header dan counter footer `{availableItems.length} item tersisa`.
    2. Pada `src/components/SpkBoronganPanel.tsx`:
       - Impor `isRabItemAllocated` dari `../utils/rabItemAllocation`.
       - Perbarui `fetchRabMaterials` untuk menerapkan `isRabItemAllocated` menggunakan data requisition dan data SPK Borongan aktif (`records` / `spkBData`).
       - Pastikan counter dan daftar "Panduan Material (RAB)" reaktif saat ada penugasan baru atau pembatalan penugasan.
  </action>
  <verify>Item "TUKANG LAS DUDUKAN SLEBOR" pada SPK-5902 WBS Pembongkaran tidak muncul di panel Alokasi RAB pada modal Requisition, dan juga tidak muncul di panel Panduan Material pada modal SPK Borongan.</verify>
  <done>Kedua modal saling mengecualikan item yang sudah digunakan secara akurat dan reaktif.</done>
</task>

<task type="auto">
  <name>Task 4: Verifikasi Linting, Type Checking, Build, dan Commit Atomik</name>
  <files>src/components/MaterialRequisitionForm.tsx, src/components/SpkBoronganPanel.tsx, src/utils/rabItemAllocation.ts</files>
  <action>
    1. Jalankan `npx oxlint` untuk memastikan kepatuhan linting tanpa peringatan/error.
    2. Jalankan `npm run build` untuk memvalidasi type checking TypeScript dan hasil bundle Vite.
    3. Validasi skenario operasional:
       - Buka modal "Minta Material" untuk WBS Pembongkaran pada SPK-5902 -> pastikan "TUKANG LAS DUDUKAN SLEBOR" tidak lagi muncul di panel kanan Alokasi RAB.
       - Buka modal "SPK Borongan" untuk WBS Pembongkaran -> pastikan "TUKANG LAS DUDUKAN SLEBOR" juga tidak muncul di panel Panduan Material (RAB).
    4. Buat commit atomik: `fix(mandor): synchronize mutual exclusion between requisition and spk borongan material lists`.
  </action>
  <verify>`npx oxlint` dan `npm run build` berhasil 100% tanpa error.</verify>
  <done>Verifikasi tuntas dan commit atomik tersimpan di git.</done>
</task>
