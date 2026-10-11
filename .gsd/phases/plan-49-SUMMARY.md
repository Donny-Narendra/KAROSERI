---
phase: 49
plan: fix-mandor-material-requisition-dual-list
completed_at: 2026-10-11T18:10:00+07:00
duration_minutes: 6
---

# Summary: Implementasi Dual-List Transfer Box pada Modal Minta Material (Requisition) Mandor

## Results
- 3 tasks completed
- All verifications passed

## Tasks Completed
| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | State Management & Data Fetching Dual-List pada MaterialRequisitionForm.tsx | cbbc3ba | ✅ |
| 2 | Desain Layout UI Dual-List Transfer Box (Kotak Kiri Hijau, Kontrol Tengah, Kotak Kanan Merah) | cbbc3ba | ✅ |
| 3 | Integrasi Submit Requisition, Validasi Transaksi, dan Verifikasi Build | cbbc3ba | ✅ |

## Deviations Applied
- None. Implementasi sesuai spesifikasi dual-list transfer box dan skema Supabase.

## Files Changed
- `src/components/MaterialRequisitionForm.tsx`:
  - Fetching alokasi `rab_items` terfilter berdasarkan tahapan WBS aktif dan SPK aktif, join ke master `materials (name, unit, unit_price, current_stock)`.
  - State dual-list: `availableItems` (Kotak Kanan / Sumber RAB) dan `selectedItems` (Kotak Kiri / Permintaan Siap Submit).
  - State pemilihan & transfer: `highlightedSourceId`, `highlightedTargetId`, handler `<<` (`handleMoveToRequisition`), handler `>>` (`handleMoveBackToAvailable`), serta dukungan double-click.
  - Fitur penambahan material ekstra di luar RAB via tombol `+ Add Item` dengan pemilihan dropdown dari master `materials`.
  - Input kuantitas dinamis dan perhitungan subtotal estimasi real-time.
  - Integrasi submit ke `material_requisitions` (`status: 'PENDING'`) dan `material_requisition_items`.

## Verification
- Dual-List State & Transfer: ✅ Passed (Transfer dua arah `<<` dan `>>` serta double-click shortcut berjalan mulus).
- Data Matching & Mapping: ✅ Passed (Pencocokan toleran WBS category dan fallback deskripsi material).
- Form Validation: ✅ Passed (Validasi minimal 1 material dengan quantity > 0 dan validasi kelengkapan material ekstra).
- Linter Check: ✅ Passed (`npx oxlint` 0 error).
- TypeScript Compiler & Vite Build: ✅ Passed (`npm run build` selesai tanpa error).
