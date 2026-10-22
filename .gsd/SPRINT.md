# Sprint 71 — Fix Partially Issued Requisitions Disappearing from Warehouse Dashboard

> **Duration**: 2026-10-22 to 2026-10-22
> **Status**: Completed ✅

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
| 1. Perbarui kueri fetching & counter pending di `WarehouseDashboard.tsx` | Antigravity | ✅ Done | 0.4h |
| 2. Perbaiki filter dan tampilan status parsial di `RequisitionApproval.tsx` | Antigravity | ✅ Done | 0.4h |
| 3. Tambahkan unit & component tests dan validasi empiris lengkap | Antigravity | ✅ Done | 0.5h |

## Daily Log

### 2026-10-22
- Sprint 68 diarsipkan ke `.gsd/sprints/sprint-68-replace-operational-columns-with-financial-metrics-in-owner-active-spk-monitoring-table.md`.
- Sprint 71 diinisialisasi untuk memperbaiki bug hilangnya pengajuan material mandor berstatus `PARTIALLY_ISSUED` di dashboard gudang.
- Task 1: Memperbarui kueri `fetchPendingReqCount` di `WarehouseDashboard.tsx` agar menyertakan relasi `material_requisition_items` dan status `.in('status', ['PENDING', 'PARTIALLY_ISSUED'])`. Memperbarui kalkulasi `pendingReqCount` dan `spkFilterList` agar menghitung kuantitas pending item.
- Task 2: Memperbarui `RequisitionApproval.tsx`:
  - `spkSummary` kini menjumlahkan sisa item berstatus `PENDING` per SPK dan mengabaikan requisition yang sudah tidak memiliki pending item.
  - Memfilter `normalizedData` agar hanya menyertakan requisition yang masih memiliki item `PENDING` (otomatis menyembunyikan yang sudah selesai).
  - Menampilkan badge status `PARSIAL (Sisa X Item Belum Disetujui)` dengan indikator titik berkedip.
  - Baris item yang `APPROVED` tetap bertanda `✓ Dirilis` dan baris `PENDING` tetap memiliki tombol `[ ✓ Rilis / Approve ]` dan `[ ✕ Tolak / Hold ]`.
- Task 3: Menambahkan unit & component test suite baru:
  - `src/components/__tests__/PartiallyIssuedRequisition.test.tsx` (3 tests)
  - `src/pages/__tests__/WarehouseDashboardPartiallyIssued.test.tsx` (1 test)
  - Full Vitest suite: 54 test files, 343 tests passing (100%).
  - Oxlint: 0 warnings, 0 errors across 193 files.
  - TypeScript & Vite build: Clean build (`npm run build` in ~760ms).

## Retrospective (end of sprint)

### What Went Well
- Mengagregasi sisa pending item di level `material_requisition_items` menjamin akurasi counter di sidebar dan tab badge, baik saat pertama kali fetching maupun setelah aksi persetujuan parsial granular.
- Filter `pendingItems.length > 0` secara otomatis dan bersih menyembunyikan tiket yang seluruh itemnya sudah selesai diproses tanpa perlu refresh halaman manual.
- Tampilan status `PARSIAL (Sisa X Item Belum Disetujui)` memberikan kejelasan langsung kepada petugas gudang tentang status dokumen dan item yang masih menunggu aksi.

### What Could Improve
- Di masa mendatang, dapat ditambahkan filter sub-tab pada panel mandor requests (misal: "Semua Pending", "Baru", "Parsial") jika volume pengajuan harian sangat tinggi.

### Action Items
- Tidak ada hutang teknis; seluruh kriteria verifikasi terpenuhi.
