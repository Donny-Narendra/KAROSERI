# Sprint 104 — Replace WBS UI Display Terms with Tahapan across Entire Application

> **Duration**: 2026-10-30 to 2026-10-30
> **Status**: Completed ✓

## Goal
Mengganti istilah teknis proyek **WBS** (Work Breakdown Structure) yang tampil di antarmuka pengguna (UI display, headers, titles, cards, badges, modal, dan export tables) dengan bahasa operasional bengkel yang lebih ramah dan mudah dipahami oleh seluruh tim dan konsumen, yaitu menjadi **"Tahapan"**, dengan tetap menjaga integritas skema database, tabel, kolom, enum, tipe data TypeScript internal, dan API RPC.

## Scope

### Included
- **Task 1: Sentralisasi Helper Pemformatan Tampilan Tahapan (`src/utils/wbsSort.ts`)**
  - Membuat dan mengekspor fungsi `formatTahapanBadge(rawStage)` yang mengonversi string internal WBS menjadi label ramah pengguna:
    * Contoh: `"WBS 1: Pembongkaran"` -> `"Tahapan 1: Pembongkaran"`.
    * Mendukung pemetaan nama kategori tanpa nomor (contoh enum DB: `'Pembongkaran'`, `'Sasis/Rangka'`, dll.).
  - Menyediakan backward-compatibility alias `formatWbsBadge = formatTahapanBadge`.
  - Melengkapi unit test di `src/utils/__tests__/wbsSort.test.ts` (8 pengujian lulus 100%).
- **Task 2: Penyesuaian UI Display Halaman `/service-advisor`**
  - Mengubah tab navigasi `WBS & QC` menjadi **`Tahapan & QC`** di `ServiceAdvisorDashboard.tsx` dan `ActiveSpkTable.tsx`.
  - Mengubah sub-judul `Ringkasan Pagu Biaya Per Tahapan WBS:` menjadi **`Ringkasan Pagu Biaya Per Tahapan:`** di `RabCalculator.tsx` dan `AmendmentManager.tsx`.
  - Mengubah header kolom tabel RAB dari `WBS` menjadi **`Tahapan`** di `RabCalculator.tsx`, `AmendmentManager.tsx`, dan `RabPerubahanTab.tsx`.
  - Mengubah label alokasi baris/kartu dari `WBS 1` s/d `WBS 5` menjadi **`Tahapan 1: Pembongkaran`** s/d **`Tahapan 5: Kelistrikan/Hidrolik`**.
  - Mengubah form alokasi: `ALOKASI WBS` menjadi **`ALOKASI TAHAPAN`**, serta header kolom matriks alokasi menjadi **`Tahap 1`** s/d **`Tahap 5`** di `RabCalculator.tsx`, `AmendmentManager.tsx`, `PackageAllocationModal.tsx`, `ChangeOrderPackageModal.tsx`, dan `packageExplosion.ts`.
  - Memperbarui komponen terkait seperti `SpkBoronganPanel.tsx`, `SpkOverheadModal.tsx`, `SpkCredentialSection.tsx`, dan `SpkSelector.tsx`.
- **Task 3: Penyesuaian UI Display Halaman `/mandor`**
  - Mengubah judul section `WBS Progress & QC` menjadi **`Progres Tahapan & QC`** di `WbsChecklist.tsx`.
  - Mengubah kartu kerja `WBS 1` s/d `WBS 5` menjadi **`Tahapan 1`** s/d **`Tahapan 5`** di `WbsChecklist.tsx`.
  - Mengubah modal acuan bahan material `Alokasi RAB (WBS Terkait)` menjadi **`Alokasi RAB (Tahapan Terkait)`** di `MaterialRequisitionForm.tsx`.
  - Mengubah teks panduan empty state di `MandorDashboard.tsx` menjadi `lembar kerja progres tahapan pekerjaan`.
- **Task 4: Penyesuaian UI Display Operasional Gudang (`/warehouse` & `/service-advisor`)**
  - Mengubah header kolom `WBS` pada tabel *Pending Requisitions* (`RequisitionApproval.tsx`) menjadi **`Tahapan`**.
  - Mengubah header kolom `WBS` pada tabel *Recent Material Issues* (`RecentMaterialIssues.tsx`) menjadi **`Tahapan`**.
- **Task 5: Penyesuaian UI Display Halaman Laporan Keuangan (`/finance-reports`)**
  - Mengubah label tab `2. Varian RAB vs Aktual (per WBS)` menjadi **`2. Varian RAB vs Aktual (per Tahapan)`** di `FinancialReportsPage.tsx`.
  - Mengubah header kolom tabel dari `Tahapan WBS` menjadi **`Tahapan Pekerjaan`** di `WbsCostVarianceTab.tsx` dan `FinancialPrintReport.tsx`.
  - Mengubah opsi print dan link navigasi audit menjadi **`Buka Tab Varian Tahapan`** di `FinancialAuditPanel.tsx`.
- **Task 6: Penyesuaian Halaman Publik `/tracking/:spk_no` & Cetak Dokumen**
  - Mengubah judul section `Rincian Tahapan (WBS)` menjadi **`Rincian Tahapan Pekerjaan`** di `PublicProgressTracking.tsx`.
  - Mengubah label kartu tahapan menjadi **`Tahapan 1: Pembongkaran`** s/d **`Tahapan 5: Kelistrikan/Hidrolik`**.
  - Mengubah progress bar dari `Total Progres WBS` menjadi **`Total Progres Tahapan`**.
  - Menyesuaikan banner masa tenggang purnajual: `Akses dokumentasi teknis tahapan terbuka hingga...`.
- **Task 7: Penyesuaian Utilitas Export Excel & Cetak Dokumen**
  - `src/utils/rabExport.ts`: Mengubah header kolom Excel menjadi **`TAHAPAN`** dan memformat nilai sel kategori dengan `formatTahapanBadge`.
  - `src/utils/rabPerubahanExport.ts`: Mengubah header kolom Excel menjadi **`Alokasi Tahapan`**.
- **Task 8: Sinkronisasi dan Pemutakhiran Seluruh Test Suite & Verifikasi Mutu**
  - Memperbarui 15 file test suite unit/komponen agar sesuai dengan label UI baru.
  - Memastikan seluruh pengujian otomatis Vitest (76 file, 565 test) lulus 100%.
  - Menjalankan linter `npx oxlint` (0 error) dan build kompilasi produksi `npm run build` (sukses).

### Explicitly Excluded (Safety Guardrails)
- Tidak mengubah nama kolom database (`wbs_category`, `wbs_stage`, `wbs_id`).
- Tidak mengubah nama tabel database (`wbs_checklists`).
- Tidak mengubah tipe enum PostgreSQL, RPC function Supabase, maupun key query API backend.
- Tidak mengubah properti interface internal TypeScript (e.g. `wbs_category`, `wbsCategory`, `wbs_stage`).

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| Task 1: Sentralisasi Helper Pemformatan Tampilan Tahapan (`formatTahapanBadge`) | Antigravity | ✅ Done | 0.2 |
| Task 2: Penyesuaian UI Display Halaman `/service-advisor` | Antigravity | ✅ Done | 0.5 |
| Task 3: Penyesuaian UI Display Halaman `/mandor` | Antigravity | ✅ Done | 0.3 |
| Task 4: Penyesuaian UI Display Operasional Gudang (`/warehouse`) | Antigravity | ✅ Done | 0.2 |
| Task 5: Penyesuaian UI Display Halaman `/finance-reports` | Antigravity | ✅ Done | 0.3 |
| Task 6: Penyesuaian Halaman Publik `/tracking/:spk_no` & Cetak PDF | Antigravity | ✅ Done | 0.3 |
| Task 7: Penyesuaian Utilitas Export Excel & Print Report | Antigravity | ✅ Done | 0.2 |
| Task 8: Sinkronisasi Test Suite & Verifikasi Mutu (Vitest, Oxlint, Build) | Antigravity | ✅ Done | 0.5 |

## Daily Log

### 2026-10-30
- Sprint 104 selesai secara menyeluruh:
  1. Helper & Sorting:
     - `src/utils/wbsSort.ts`: Mengimplementasikan helper `formatTahapanBadge(rawStage)` yang ramah pengguna serta mengaitkan alias kompatibilitas `formatWbsBadge`.
     - `src/utils/__tests__/wbsSort.test.ts`: Memvalidasi pengujian helper baru (8 tests PASS).
  2. Modul Service Advisor:
     - Mengubah tab `WBS & QC` menjadi `Tahapan & QC` pada `ServiceAdvisorDashboard.tsx` dan `ActiveSpkTable.tsx`.
     - Mengubah label subjudul pagu biaya, kolom tabel, dan label kartu dari WBS menjadi Tahapan pada `RabCalculator.tsx`, `AmendmentManager.tsx`, dan `RabPerubahanTab.tsx`.
     - Memperbarui matriks alokasi paket dan modal di `PackageAllocationModal.tsx`, `ChangeOrderPackageModal.tsx`, dan `packageExplosion.ts`.
     - Menyesuaikan rincian di `SpkBoronganPanel.tsx`, `SpkOverheadModal.tsx`, `SpkCredentialSection.tsx`, dan `SpkSelector.tsx`.
  3. Modul Mandor & Gudang:
     - Mengubah judul progres dan kartu tahapan di `WbsChecklist.tsx` dan `MandorDashboard.tsx`.
     - Mengubah acuan alokasi pada form permintaan material di `MaterialRequisitionForm.tsx`.
     - Menyesuaikan header kolom tabel `Tahapan` pada `RequisitionApproval.tsx` dan `RecentMaterialIssues.tsx`.
  4. Modul Laporan Keuangan:
     - Mengubah judul tab dan tabel di `FinancialReportsPage.tsx`, `WbsCostVarianceTab.tsx`, `FinancialPrintReport.tsx`, dan `FinancialAuditPanel.tsx`.
  5. Modul Publik & Cetak Dokumen:
     - Menyesuaikan section, progress bar, dan label kartu tahapan di `PublicProgressTracking.tsx`.
     - Menyelaraskan header export di `rabExport.ts` dan `rabPerubahanExport.ts`.
  6. Pemutakhiran Test Suites & Verifikasi:
     - Memperbarui 15 file test yang memverifikasi teks UI WBS agar mencocokkan istilah baru Tahapan.
     - Pengujian unit Vitest: 76 test files, 565 tests lulus 100%.
     - Linter: `npx oxlint` lulus dengan 0 errors (9 warnings fast-refresh pre-existing).
     - Build: `npm run build` (`tsc -b && vite build`) berhasil sukses tanpa error.

