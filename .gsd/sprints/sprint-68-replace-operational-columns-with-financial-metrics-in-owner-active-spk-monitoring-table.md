# Sprint 68 — Replace Operational Columns with Financial Metrics in Owner Active SPK Monitoring Table

> **Duration**: 2026-10-21 to 2026-10-21
> **Status**: Completed ✅

## Goal
Mengganti kolom operasional (WBS Phase, DP Status, Material Gate) pada tabel pemantauan SPK Aktif Owner Dashboard (`/dashboard`) dengan metrik finansial komprehensif (Total HPP, Total Tagihan, dan Realisasi Biaya Aktual beserta indikator selisih real-time margin/varian terhadap HPP), serta mengimplementasikan service agregasi finansial per SPK di `dashboardService.ts` dan komponen tabel termodularisasi `ActiveSpkTable.tsx`.

## Scope

### Included
- **Service Layer (`src/services/dashboardService.ts`)**:
  - Tipe data kontrak `SpkFinancialMetrics` dan `DashboardSpkItem`.
  - Fungsi kalkulasi murni `calculateSpkFinancialMetrics(spk)`:
    1. `Total HPP` = Modal RAB Awal (`total_estimated_cost`) + Modal Item Change Orders APPROVED (`total_cost` / `cost_amount` / `cost_adjustment`).
    2. `Total Tagihan` = Nilai Jual Kontrak Awal (`total_selling_price` / `final_bill_amount` / default RAB * 1.25) + Revenue Change Orders APPROVED (`total_amount` / `selling_price`).
    3. `Realisasi Biaya Aktual` = Material Approved dikeluarkan gudang (`material_issues` / `inventory_transactions`) + SPK Borongan Tukang aktif (`spk_borongan`) + Overhead FOH tercatat (`spk_overhead_logs`).
    4. Indikator varian biaya terhadap HPP (`varianceAmount`, `variancePercentage`, `isOverbudget`).
  - Fungsi fetching data komprehensif `fetchOwnerDashboardSpks()` dengan defensive joins dan fallback mulus.
- **Tabel Monitoring SPK (`src/components/ActiveSpkTable.tsx`)**:
  - Penggantian header kolom:
    - Kolom 3: `TOTAL HPP` (format mata uang IDR & subtext rincian RAB + CO).
    - Kolom 4: `TOTAL TAGIHAN` (format mata uang IDR & subtext nilai kontrak jual).
    - Kolom 5: `REALISASI BIAYA AKTUAL` (format mata uang IDR, tooltip 3 elemen biaya, dan badge varian real-time: `Overbudget +Rp X` merah atau `Sisa Pagu Rp X / X% HPP` hijau).
  - Kolom SPK No., Client, QC Status, Handover, dan Aksi Manajerial tetap presisi.
- **Halaman Owner Dashboard (`src/pages/AdminDashboardPage.tsx`)**:
  - Integrasi `dashboardService.fetchOwnerDashboardSpks()` dan komponen `ActiveSpkTable`.
  - Pembaruan ekspor ringkasan CSV agar memuat kolom finansial baru (Total HPP, Total Tagihan, Realisasi Aktual, Varian, Status Biaya).
  - Peningkatan akurasi filter OVERBUDGET dengan memeriksa `financials.isOverbudget`.
- **Localization (`src/locales/id.json` & `src/locales/en.json`)**:
  - Penambahan kunci terjemahan: `total_hpp`, `total_tagihan`, `realisasi_biaya_aktual`, `variance_overbudget`, `variance_remaining`.
- **Testing & Empirical Validation**:
  - Unit test `src/services/__tests__/dashboardService.test.ts` (6 tests).
  - Component test `src/components/__tests__/ActiveSpkTable.test.tsx` (6 tests).
  - Full suite Vitest (50 test suites, 327 tests passing), Oxlint zero-warning (181 files), TypeScript clean compilation (`tsc -b`), and Vite production build (485ms).

### Explicitly Excluded
- Mengubah skema database migrasi core tabel `spk`, `change_orders`, atau `spk_borongan`.
- Mengubah alur kerja kasir pembayaran invoice atau modal BAST handover.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Create `dashboardService.ts` (Financial Metrics Calculation & Fetching) | Antigravity | ✅ Done | 0.5h |
| 2. Create `ActiveSpkTable.tsx` Component with Financial Columns & Variance Badges | Antigravity | ✅ Done | 0.8h |
| 3. Integrate `dashboardService` & `ActiveSpkTable` into `AdminDashboardPage.tsx` & Update CSV Export | Antigravity | ✅ Done | 0.5h |
| 4. Update Localization Files (`id.json` & `en.json`) | Antigravity | ✅ Done | 0.2h |
| 5. Unit & Component Testing + Empirical Verification (Vitest, Oxlint, `tsc -b`, Build) | Antigravity | ✅ Done | 0.6h |

## Daily Log

### 2026-10-21
- Sprint 67 archived to `.gsd/sprints/sprint-67-dynamic-expense-categories-management-for-company-opex-logging.md`.
- Sprint 68 initialized: Replace Operational Columns with Financial Metrics in Owner Active SPK Monitoring Table.
- Task 1: Implemented `src/services/dashboardService.ts` with `calculateSpkFinancialMetrics` (Total HPP = RAB + CO Approved; Total Tagihan = Selling Price + CO Approved; Realisasi Biaya Aktual = Material Issues + Borongan Labor + FOH Logs; Variance & Overbudget calculation) and `fetchOwnerDashboardSpks` with progressive fallback.
- Task 2: Created `src/components/ActiveSpkTable.tsx` rendering `TOTAL HPP`, `TOTAL TAGIHAN`, and `REALISASI BIAYA AKTUAL` with real-time margin/variance badges (`Overbudget +Rp X` in red, `Sisa: Rp X (X%)` in green) and 3-pillar costing breakdown.
- Task 3: Integrated `dashboardService` and `ActiveSpkTable` into `src/pages/AdminDashboardPage.tsx`. Enhanced CSV export to include Total HPP, Total Tagihan, Realisasi Aktual, and Selisih Varian.
- Task 4: Updated `src/locales/id.json` and `src/locales/en.json` with bilingual keys for financial columns and variance indicators.
- Task 5: Added comprehensive test suites:
  - `src/services/__tests__/dashboardService.test.ts` (6 tests passing)
  - `src/components/__tests__/ActiveSpkTable.test.tsx` (6 tests passing)
  - Full Vitest suite: 50 test suites, 327 tests passing (100%).
  - Oxlint: 0 warnings, 0 errors across 181 files.
  - TypeScript: Clean compilation (`tsc -b`).
  - Production build: Succeeded in 485ms (`npm run build`).

## Retrospective (end of sprint)

### What Went Well
- Pure calculation helper `calculateSpkFinancialMetrics` allows immediate and 100% testable financial metric computation without relying on database view latencies or fragile join syntax.
- Modularizing `ActiveSpkTable.tsx` removes over 80 lines of cluttered inline HTML from `AdminDashboardPage.tsx` and enables focused unit testing with React Testing Library.
- Real-time margin / variance indicator badge immediately highlights overbudget SPKs in red with exact deficit amounts while reassuring the Owner with remaining budget margins for healthy SPKs.

### What Could Improve
- In a future phase, a quick modal drilldown clicking on the variance badge could display item-by-item material, labor, and overhead expenditure logs directly.

### Action Items
- None; all features implemented, tested, and empirically verified.
