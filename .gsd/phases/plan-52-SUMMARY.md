---
phase: 52
plan: fix-exclude-used-items-from-rab-panel
completed_at: 2026-10-11T19:51:50+07:00
duration_minutes: 5
---

# Summary: Eksklusi Material yang Sudah Digunakan (di Minta Material maupun SPK Borongan) dari Panel Alokasi RAB pada /mandor

## Results
- 3 tasks completed
- All verifications passed

## Tasks Completed
| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | Kueri Data Pembanding Cross-Module (Requisitions & SPK Borongan) di MaterialRequisitionForm | bbb1fb3 | ✅ |
| 2 | Logika Pemfilteran Panel "Alokasi RAB (WBS Terkait)" & Sinkronisasi Badge & Indikator Sisa | bbb1fb3 | ✅ |
| 3 | Verifikasi Linting, Type Checking, Build Validation, dan Commit Atomik | bbb1fb3 | ✅ |

## Deviations Applied
- None. Implementasi sesuai spesifikasi query pembanding cross-module, filter eksklusi 3 kriteria, dan sinkronisasi badge/footer.

## Files Changed
- `src/components/MaterialRequisitionForm.tsx`:
  - Menambahkan interface `ActiveSpkBorongan` serta state `rawRabItems`, `usedRequisitionItemIds`, dan `activeSpkBoronganList`.
  - Mengimplementasikan kueri cross-module ke tabel `material_requisitions` & `material_requisition_items` (`status !== 'REJECTED'`) untuk SPK & WBS aktif guna menghimpun material yang sudah diajukan ke logistik gudang.
  - Mengimplementasikan kueri cross-module ke tabel `spk_borongan` (`status !== 'CUT_OFF'`) untuk SPK & WBS aktif guna mengambil penugasan borongan aktif.
  - Menerapkan komputasi reaktif `availableItems` menggunakan `useMemo` yang menyaring item RAB berdasarkan:
    1. Requisition tersimpan di database (`usedRequisitionItemIds`).
    2. Daftar permintaan lokal yang sedang dipilih dalam modal (`selectedItems`).
    3. Penugasan borongan aktif di SPK Borongan (`activeSpkBoronganList` melalui `material_id` maupun kesesuaian deskripsi/nama material).
  - Menyederhanakan handler transfer dua arah (`handleMoveToRequisition` dan `handleMoveBackToAvailable`) agar otomatis sinkron dengan state reaktif tanpa mutasi manual.
  - Memperbarui counter badge panel kanan (`{availableItems.length}`), indikator footer (`{availableItems.length} item tersisa`), dan deskripsi state kosong.

## Verification
- Cross-Module Fetching: ✅ Passed (Data requisitions dan penugasan spk_borongan berhasil dimuat saat modal dibuka).
- Exclusion Logic & Filter: ✅ Passed (Item yang telah diajukan di requisition atau ditugaskan di SPK-B otomatis disaring dari panel alokasi RAB).
- Badge & Counter Synchronization: ✅ Passed (Badge header dan teks footer konsisten mencerminkan jumlah item tersisa).
- TypeScript Compiler & Vite Build: ✅ Passed (`npm run build` selesai tanpa error).
- Linter Validation: ✅ Passed (`npx oxlint` 0 error).
