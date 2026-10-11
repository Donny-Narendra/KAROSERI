## Current Position
- **Phase**: 52 (completed)
- **Task**: All tasks complete
- **Status**: Verified

## Gap Closure Mode
Completed gap closure for Phase 52 (Eksklusi Material yang Sudah Digunakan di Minta Material maupun SPK Borongan dari Panel Alokasi RAB pada /mandor).

## Last Session Summary
Eksekusi Phase 52 selesai: Penyesuaian modal Permintaan Material (`src/components/MaterialRequisitionForm.tsx`):
1. **Kueri Cross-Module**:
   - Query `material_requisitions` & `material_requisition_items` (`status !== 'REJECTED'`) untuk SPK & WBS terkait guna mengumpulkan daftar ID material yang sudah diajukan ke logistik gudang.
   - Query `spk_borongan` (`status !== 'CUT_OFF'`) untuk SPK & WBS terkait guna mengambil penugasan borongan aktif.
2. **Logika Pemfilteran Panel "Alokasi RAB (WBS Terkait)"**:
   - Filter `rawRabItems` reaktif via `useMemo` mengecualikan:
     - Material yang sudah tercatat di Requisition tersimpan di database.
     - Material yang sedang berada di daftar permintaan modal aktif (`selectedItems`).
     - Pekerjaan/material yang sudah ditugaskan di SPK Borongan (pencocokan `material_id` maupun kesesuaian deskripsi tugas dengan nama material).
3. **Sinkronisasi Badge & Indikator Sisa**:
   - Header badge `{availableItems.length}`, label footer `{availableItems.length} item tersisa`, dan empty state terupdate secara otomatis dan akurat.
4. **Verifikasi & Build**:
   - Linter (`npx oxlint` 0 error) dan build (`npm run build` 100% sukses).
   - Commit atomik: `bbb1fb3` (`fix(mandor): exclude items used in requisitions and spk borongan from rab allocation panel`).

## In-Progress Work
None.

## Blockers
None.

## Next Steps
1. Menunggu instruksi atau perencanaan fitur selanjutnya.
