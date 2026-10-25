# Sprint 94 — Sync Owner Dashboard KPI and WIP Values with Consolidated RAB Perubahan Totals

> **Duration**: 2026-10-25 to 2026-10-25
> **Status**: In Progress

## Goal
Synchronize aggregation query and calculations in `AdminDashboardPage.tsx` and `dashboardService.ts` to reflect the latest consolidated figures from RAB Perubahan & Billing Kasir (Total Tagihan Rp 5.322.000, Total Modal HPP Rp 3.065.264, Margin 42.4%).

## Scope

### Included
- **Task 1: Perbarui Query Agregasi Dashboard di `AdminDashboardPage.tsx` / `dashboardService.ts`**
  1. Pada fungsi pengambilan data SPK aktif (`fetchOwnerDashboardSpks` / `fetchActiveSpkMonitoring`):
     - Jangan gunakan field fallback `spk.total_estimated_cost` statis saat menghitung Total HPP dan Total Tagihan jika data RAB & Change Order tersedia.
     - Ambil data paket dan rincian item pekerjaan untuk menghitung quotation awal konsolidasi (termasuk harga jual paket assembly dan item granular).
     - Hitung total tagihan konsolidasi:
       `totalTagihan = totalQuotationRAB + totalApprovedChangeOrders` (hasilnya Rp 5.322.000).
     - Hitung total modal HPP:
       `totalHpp = totalHppRAB + totalHppApprovedChangeOrders` (hasilnya Rp 3.065.264).
  2. Perbarui kalkulasi kartu **TOTAL NILAI WIP**:
     - Nilai WIP untuk SPK aktif harus merefleksikan nilai total tagihan berjalan atau total HPP riil yang sedang diproses (Rp 5.322.000).
  3. Perbarui kartu **Actual Costing vs Projected Margin**:
     - `Projected Cost` = Total Modal HPP konsolidasi (Rp 3.065.264).
     - `Actual Cost` = Realisasi fisik yang sudah keluar (Material Goods Issue + SPK Borongan Terbit + Log FOH).
     - `Profit Margin %` = `((Total Tagihan - Total HPP) / Total Tagihan) * 100` (menghasilkan 42.4%).
- **Task 2: Verification and Automated Tests**
  - Verify cards and table in Owner Dashboard (`/dashboard`).
  - Unit tests in `src/services/__tests__/dashboardService.test.ts` and `src/components/__tests__/ActiveSpkTable.test.tsx` or `AdminDashboardPage.test.tsx`.
  - Validate `npm run build` and `npx oxlint`.

### Explicitly Excluded
- Modifying warehouse fulfillment or material requisition workflows.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| Task 1: Update dashboard aggregation query and metrics calculation | Claude | ✅ Done | 0.5 |
| Task 2: Update Owner Dashboard page cards and monitoring table logic | Claude | ✅ Done | 0.5 |
| Task 3: Automated tests, build verification, and git commit | Claude | ✅ Done | 0.5 |

## Daily Log

### 2026-10-25
- Sprint 93 closed and archived.
- Sprint 94 completed: Sync Owner Dashboard KPI and WIP Values with Consolidated RAB Perubahan Totals.
- Updated `src/services/dashboardService.ts` and created `src/services/adminDashboardService.ts`:
  * Enhanced `calculateSpkFinancialMetrics` to compute accurate base quotation using product packages catalog (`package_id` / `package_name`) and granular non-package components.
  * Corrected total HPP calculation to aggregate component-level costs from `rab_items` and itemized `change_orders` (yielding Rp 3.065.264 for SPK-3093).
  * Consolidated total billing quotation with approved change order amounts (yielding Rp 5.322.000 for SPK-3093).
  * Added alias `fetchActiveSpkMonitoring` mapping to `fetchOwnerDashboardSpks`.
- Updated `src/pages/AdminDashboardPage.tsx`:
  * Calculated `totalWipValue` using active SPK `financials.totalTagihan` (yielding Rp 5.322.000).
  * Replaced static estimated cost calculations with consolidated `fin.totalHpp` (Rp 3.065.264) and real physical realization `fin.totalRealisasiAktual`.
  * Computed profit margin using `((totalTagihan - totalHpp) / totalTagihan) * 100` (yielding +42.4%).
- Verified 72 test suites (515 tests green), 0 oxlint errors, and successful production build.
