# Sprint 71 — Fix Partially Issued Requisitions Disappearing from Warehouse Dashboard

> **Duration**: 2026-10-22 to 2026-10-22
> **Status**: In Progress

## Goal
Memperbaiki antrean permohonan material mandor dan counter sidebar di `/warehouse` agar tetap menampilkan requisition berstatus `PARTIALLY_ISSUED` beserta sisa item pending dan status rilisnya, serta memastikan dokumen yang sudah tidak memiliki sisa pending disembunyikan secara tepat.

## Scope

### Included
- **Kueri Data Requisition Gudang (`src/pages/WarehouseDashboard.tsx`)**:
  - Mengambil requisition dengan status `'PENDING'` DAN `'PARTIALLY_ISSUED'`.
  - Mengambil data relasi `material_requisition_items` untuk menghitung sisa item berstatus `'PENDING'`.
  - Memperbarui counter pending di sidebar "Filter Berdasarkan SPK" dan header tab "Mandor Requests" agar menghitung jumlah item `PENDING` pada dokumen `PARTIALLY_ISSUED`.
- **Render Kartu dan Tabel Requisition (`src/components/RequisitionApproval.tsx`)**:
  - Memfilter daftar kartu hanya menampilkan requisition yang masih memiliki `pendingItems.length > 0` (otomatis sembunyikan jika 0).
  - Menampilkan badge status `PARSIAL (Sisa X Item Belum Disetujui)` pada dokumen berstatus `PARTIALLY_ISSUED`.
  - Memastikan baris item berstatus `APPROVED` bertanda badge `✓ Dirilis` dan baris `PENDING` tetap memiliki tombol aksi `[ ✓ Rilis / Approve ]` dan `[ ✕ Tolak / Hold ]`.
  - Menghitung jumlah pending item per SPK pada `spkSummary` untuk sinkronisasi sidebar filter.
- **Unit & Component Testing**:
  - Pengujian komponen untuk verifikasi requisition `PARTIALLY_ISSUED`, badge sisa item, status rilis, dan perbaruan counter sidebar.
  - Verifikasi menyeluruh: Oxlint, TypeScript compilation (`tsc -b`), Vitest, dan build produksi.

### Explicitly Excluded
- Mengubah skema migrasi tabel database PostgreSQL.
- Mengubah alur persetujuan material di sisi mandor (`/mandor`).

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Perbarui kueri fetching & counter pending di `WarehouseDashboard.tsx` | Antigravity | ⏳ In Progress | 0.4h |
| 2. Perbaiki filter dan tampilan status parsial di `RequisitionApproval.tsx` | Antigravity | ⬜ Todo | 0.4h |
| 3. Tambahkan unit & component tests dan validasi empiris lengkap | Antigravity | ⬜ Todo | 0.5h |

## Daily Log

### 2026-10-22
- Sprint 68 diarsipkan ke `.gsd/sprints/sprint-68-replace-operational-columns-with-financial-metrics-in-owner-active-spk-monitoring-table.md`.
- Sprint 71 diinisialisasi untuk memperbaiki bug hilangnya pengajuan material mandor berstatus `PARTIALLY_ISSUED` di dashboard gudang.
