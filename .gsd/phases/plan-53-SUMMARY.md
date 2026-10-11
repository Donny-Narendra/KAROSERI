---
phase: 53
plan: fix-sync-mutual-exclusion-requisition-spk-borongan
completed_at: 2026-10-11T20:18:00+07:00
duration_minutes: 8
---

# Summary: Sinkronisasi Mutual Exclusion Material Antara Requisition dan SPK Borongan di Mandor

## Results
- 4 tasks completed
- All verifications passed

## Tasks Completed
| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | Skema / Data Tracking Penggunaan Item pada SPK Borongan (`material_id`, `rab_item_id`) | 36c2d8e | ✅ |
| 2 | Pembuatan Utilitas Shared Availability Filter (`src/utils/rabItemAllocation.ts`) | 4b1f576 | ✅ |
| 3 | Terapkan Shared Availability Filter di Kedua Modal (`MaterialRequisitionForm.tsx` & `SpkBoronganPanel.tsx`) | 55d035b | ✅ |
| 4 | Verifikasi Linting, Type Checking, Build Validation, dan Commit Atomik | 55d035b | ✅ |

## Deviations Applied
- None. Implementasi sesuai spesifikasi: penambahan tracking item RAB pada `spk_borongan`, pembuatan shared availability filter yang menangani substring matching / mandor notes, dan penerapan di kedua modal mandor dengan counter reaktif.

## Files Changed
- `supabase/migrations/20261011201500_add_material_tracking_to_spk_borongan.sql`:
  - Menambahkan kolom `material_id` (FK `materials(id)`) dan `rab_item_id` (FK `rab_items(id)`) pada tabel `public.spk_borongan`.
  - Menambahkan indeks database `idx_spk_borongan_material_id` dan `idx_spk_borongan_rab_item_id`.
  - Melakukan backfill tracking item untuk record SPK-B lama yang memiliki kesesuaian deskripsi tugas dengan item RAB.
- `src/utils/rabItemAllocation.ts`:
  - Membuat fungsi normalisasi teks `normalizeText` yang toleran terhadap spasi, huruf besar/kecil, dan tanda baca.
  - Mengimplementasikan `isRabItemAllocated(rabItem, requisitions, assignments, localRequisitions)` untuk memeriksa alokasi item RAB secara komprehensif:
    1. Pencocokan ID material (`material_id`, `rab_item_id`, `materialId`).
    2. Pengecualian status `CANCELLED`, `REJECTED`, dan `CUT_OFF`.
    3. Substring matching case-insensitive antara nama item RAB dan deskripsi tugas borongan mandor (menghindari kegagalan jika mandor menambahkan catatan pengerjaan).
- `src/components/SpkBoronganPanel.tsx`:
  - Memperbarui interface `SpkBorongan` untuk menyertakan `material_id` dan `rab_item_id`.
  - Pada `handleCreate`, menyimpan referensi `material_id` dan `rab_item_id` saat penugasan dibuat dari transfer RAB.
  - Memperbarui `fetchRabMaterials` untuk mengambil penugasan aktif SPK Borongan dan menyaring item RAB menggunakan `isRabItemAllocated`.
  - Memperbarui `filteredMaterials` agar reaktif terhadap state lokal `records` menggunakan `isRabItemAllocated`.
  - Memperbarui teks panduan dan empty state untuk memperjelas mutual exclusion cross-module.
- `src/components/MaterialRequisitionForm.tsx`:
  - Memperbarui interface `ActiveSpkBorongan` dengan `rab_item_id`.
  - Mengganti logika pemfilteran `availableItems` menggunakan fungsi terpadu `isRabItemAllocated`.
  - Sinkronisasi otomatis badge header (`{availableItems.length}`) dan footer counter (`{availableItems.length} item tersisa`).

## Verification
- Unit Testing Filter: ✅ Passed (Pengujian mandiri dengan assertions untuk substring matching, ID matching, dan status CUT_OFF).
- Real Database Verification: ✅ Passed (Material "TUKANG LAS DUDUKAN SLEBOR" pada SPK-5902 Pembongkaran terbukti terdeteksi `isAllocated: true` dan terfilter dari kedua modal).
- TypeScript Compiler & Vite Build: ✅ Passed (`npm run build` berhasil tanpa error).
- Linter Validation: ✅ Passed (`npx oxlint` 0 error).
