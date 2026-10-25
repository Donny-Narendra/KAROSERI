# Sprint 95 — Reconcile Financial Reports and Executive Dashboard with Validated RAB Perubahan Totals

> **Duration**: 2026-10-25 to 2026-10-25
> **Status**: Completed ✓

## Goal
Reconcile PostgreSQL view `view_spk_job_profitability`, RPC function `get_financial_executive_summary`, and UI components `JobProfitabilityTab.tsx` and `ExecutiveKpiCards.tsx` with validated RAB Perubahan and Kasir Billing figures (Total Omzet Rp 5.322.000, Total Modal HPP Rp 3.065.264, Margin 42.4%).

## Scope

### Included
- **Task 1: Perbarui View Database di Migrasi SQL (`supabase/migrations/20261025010000_reconcile_financial_reports_view.sql`)**
  1. Perbarui View `view_spk_job_profitability` agar menyerap nilai paket utuh dan biaya total:
     - Consolidated items dari `rab_items` dan `change_order_items` yang berstatus `APPROVED`.
     - Agregasi `package_summary`: `package_revenue`, `package_cogs`, `pkg_material_cogs`, `pkg_labor_cogs`, `pkg_foh_cogs`.
     - Agregasi `granular_summary`: `granular_mat_revenue`, `granular_labor_revenue`, `granular_foh_revenue`, `granular_mat_cogs`, `granular_labor_cogs`, `granular_foh_cogs`.
     - Total revenue konsolidasi (Paket + Granular) = Rp 5.322.000.
     - HPP per kategori komprehensif (Paket + Granular): `actual_material_cost` = Rp 837.264, `actual_labor_cost` = Rp 2.100.000, `actual_overhead_cost` = Rp 128.000.
     - Total HPP = Rp 3.065.264.
     - Keuntungan 4 Pilar: `package_profit` (Rp 2.192.336), `granular_material_profit` (Rp 2.400), `granular_labor_profit` (Rp 30.000), `granular_overhead_profit` (Rp 32.000).
     - Gross profit = Rp 2.256.736, gross margin = 42.4%.
  2. Perbarui view dependen `view_corporate_monthly_pnl`.
  3. Perbarui RPC `get_financial_executive_summary` agar mengekstrak metrik langsung dari `view_spk_job_profitability`.
- **Task 2: Selaraskan Komponen UI Frontend**
  - `src/components/finance/JobProfitabilityTab.tsx`:
    * 4 Top Summary Cards (Laba Paket Assembly Rp 2.192.336, Laba Material Lepas Rp 2.400, Laba Labor Mandor Rp 30.000, Laba FOH Rp 32.000).
    * SPK-3093 table row: Pendapatan Rp 5.322.000, Biaya Bahan Rp 837.264, Biaya Borongan Rp 2.100.000, Biaya Overhead Rp 128.000, Laba Kotor Rp 2.256.736, Margin 42.4%.
  - `src/components/finance/ExecutiveKpiCards.tsx`:
    * Total Omzet SPK: Rp 5.322.000
    * Biaya Bahan Baku Riil: Rp 837.264 (15.7% dari Omzet)
    * Borongan Mandor: Rp 2.100.000 (39.5% dari Omzet)
    * Biaya Overhead Pabrikasi: Rp 128.000 (2.4% dari Omzet)
    * Laba Operasional & Margin: Rp 2.256.736 (42.4%), Total Modal HPP Rp 3.065.264.
- **Task 3: Unit Testing & Build Verification**
  - Unit test SPK-3093 di `src/components/finance/__tests__/ExecutiveKpiCards.test.tsx`.
  - Unit test SPK-3093 di `src/components/finance/tabs/__tests__/JobProfitabilityTab.test.tsx`.
  - Unit test SPK-3093 di `src/services/__tests__/financialReportsService.test.ts`.
  - 72 test files (518 tests green), 0 oxlint errors, dan build production sukses.

### Explicitly Excluded
- Mengubah alur approval change order atau form input RAB kalkulator.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| Task 1: Update SQL migrations for view_spk_job_profitability and get_financial_executive_summary | Claude | ✅ Done | 0.5 |
| Task 2: Align UI components and verify executive cards + job profitability table | Claude | ✅ Done | 0.5 |
| Task 3: Automated tests and build verification | Claude | ✅ Done | 0.5 |

## Daily Log

### 2026-10-25
- Sprint 94 archived to `.gsd/sprints/sprint-94-sync-owner-dashboard-kpi-and-wip-values-with-consolidated-rab-perubahan-totals.md`.
- Sprint 95 created: Reconcile Financial Reports and Executive Dashboard with Validated RAB Perubahan Totals.
- Created migration `supabase/migrations/20261025010000_reconcile_financial_reports_view.sql`:
  * Upgraded `view_spk_job_profitability` to aggregate package and non-package components with comprehensive COGS breakdown (`actual_material_cost` = pkg_material_cogs + granular_mat_cogs, `actual_labor_cost` = pkg_labor_cogs + granular_labor_cogs, `actual_overhead_cost` = pkg_foh_cogs + granular_foh_cogs).
  * Upgraded `get_financial_executive_summary` to extract metrics directly from `view_spk_job_profitability`.
  * Updated dependent view `view_corporate_monthly_pnl`.
- Aligned UI frontend components (`JobProfitabilityTab.tsx` and `ExecutiveKpiCards.tsx`) and verified exact reconciliation for SPK-3093.
- Added comprehensive unit tests in `ExecutiveKpiCards.test.tsx`, `JobProfitabilityTab.test.tsx`, and `financialReportsService.test.ts`.
- Verified 72 test suites (518 tests green), 0 oxlint errors, and successful production build.
