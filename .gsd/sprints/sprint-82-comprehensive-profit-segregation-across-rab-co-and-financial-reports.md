# Sprint 82 — Comprehensive Profit Segregation (Assembly Package vs Granular Items) across RAB, Change Orders, and Financial Reports

> **Duration**: 2026-10-23 to 2026-10-23
> **Status**: Completed

## Goal
Implement comprehensive 3-pillar profit segregation (Finished Goods Assembly BOM Package profit vs Granular Raw Material markup profit vs Granular Labor & Overhead margin) across the database reporting layer (`view_spk_job_profitability`), financial reporting UI & Excel/CSV exports, RAB Calculator, and Change Order form (incorporating both baseline RAB items and approved Change Orders).

## Scope

### Included
- **Task 1: Database Migration & Reporting View Layer (`view_spk_job_profitability`)**
  - Created migration `20261024020000_segregate_package_and_granular_profit.sql` aggregating items from `rab_items` and approved `change_order_items`.
  - Calculated segregated revenue, COGS, and profit for:
    1. Finished goods assembly package (`package_revenue`, `package_cogs`, `package_profit`).
    2. Granular raw material (`granular_mat_revenue`, `granular_mat_cogs`, `granular_material_profit`).
    3. Granular labor & overhead (`granular_other_revenue`, `granular_other_cogs`, `granular_other_profit`).
    4. Accumulative totals (`total_revenue`, `total_cogs`, `gross_profit`, `gross_margin_percentage`).
  - Preserved backward compatibility for `actual_material_cost`, `actual_labor_cost`, `actual_overhead_cost`, and `payment_status` to ensure dependent corporate views (`view_corporate_monthly_pnl`) and executive summary RPCs remain fully operational.
  - Excluded `DRAFT` and `PENDING_PAYMENT` SPKs.
- **Task 2: Financial Reporting Service Layer & Type Contracts**
  - Updated `SpkJobProfitability` interface in `src/types/financialReports.ts` with new segregated profit columns.
  - Updated `financialReportsService.ts` (`getJobProfitability`) to parse and normalize segregated fields as numbers.
  - Updated `exportFinancialReports.ts` (`mapProfitabilityToExcelRows`) to include segregated profit breakdown columns in Excel and CSV reports.
- **Task 3: Financial Reports UI Module (`JobProfitabilityTab.tsx`)**
  - Updated `JobProfitabilityTab.tsx` with:
    - 3-pillar summary KPI cards (`📦 Profit Paket Assembly (BOM)`, `📋 Profit Material Granular`, `⚙️ Profit Jasa & Overhead Lepas`).
    - Dedicated table columns: `Profit Paket (BOM)`, `Profit Mat. Granular`, `Profit Jasa & FOH`.
    - Table footer aggregates computing totals across operational SPKs.
- **Task 4: RAB Calculator Financial Summary Sub-Breakdown (`RabCalculator.tsx`)**
  - Computed live segregated profit metrics in `RabCalculator.tsx`:
    - Package BOM Profit: `Σ (selling_price - cost_price)` for package components.
    - Granular Material Markup: `Σ (selling_price - cost_price)` for non-package material items.
    - Granular Labor & Overhead Profit: `Σ (selling_price - cost_price)` for non-package labor and overhead items.
  - Displayed 3-pillar sub-breakdown cards in the financial summary section.
- **Task 5: Change Order Form Financial Summary Sub-Breakdown (`AmendmentManager.tsx`)**
  - Computed live segregated profit metrics for draft items in `AmendmentManager.tsx`.
  - Displayed 3-pillar sub-breakdown cards (`📦 Profit Paket (BOM)`, `📋 Profit Mat. Granular`, `⚙️ Profit Jasa & FOH`) in the financial summary panel.
- **Task 6: Testing & Quality Gate Verification**
  - Added unit and component tests in `financialReportsService.test.ts`, `JobProfitabilityTab.test.tsx`, `exportFinancialReports.test.ts`, `RabCalculatorLabor.test.tsx`, and `AmendmentManager.test.tsx`.
  - Passed full quality gate: TypeScript (`tsc -b`), Oxlint (0 errors, 0 warnings), Vitest (60 suites, 423 tests passing - 100% green), and production build (`npm run build`).

### Explicitly Excluded
- Altering physical inventory reservation logic in warehouse approvals.
- Modifying cashflow / payment receipt ledger posting procedures.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Create SQL migration `20261024020000_segregate_package_and_granular_profit.sql` | Antigravity | ✅ Completed | 0.5h |
| 2. Update financial reporting types, service layer, and Excel/CSV exporters | Antigravity | ✅ Completed | 0.5h |
| 3. Update `JobProfitabilityTab.tsx` UI with segregated profit columns and summary totals | Antigravity | ✅ Completed | 0.5h |
| 4. Update `RabCalculator.tsx` financial summary with segregated profit cards | Antigravity | ✅ Completed | 0.5h |
| 5. Update `AmendmentManager.tsx` financial summary with segregated profit cards | Antigravity | ✅ Completed | 0.5h |
| 6. Add automated tests and verify full quality gates | Antigravity | ✅ Completed | 0.5h |

## Daily Log

### 2026-10-23
- Archived Sprint 81 into `.gsd/sprints/sprint-81-allow-multi-instance-package-selection-in-change-orders.md`.
- Initialized Sprint 82: Comprehensive Profit Segregation across RAB, Change Orders, and Financial Reports.
- Implemented Task 1:
  - Created migration `20261024020000_segregate_package_and_granular_profit.sql`.
  - Aggregated `rab_items` and approved `change_order_items` via UNION ALL.
  - Computed 3 profit pillars (Package BOM, Granular Material, Granular Labor & Overhead) and total profitability.
  - Recreated `view_corporate_monthly_pnl` with complete column compatibility.
- Implemented Task 2:
  - Added segregated profit fields to `SpkJobProfitabilityItem` in `src/types/financialReports.ts`.
  - Updated `getJobProfitability` in `src/services/financialReportsService.ts` to parse segregated metrics as numbers.
  - Added Profit Paket Assembly, Profit Material Granular, and Profit Jasa & Overhead columns to `mapProfitabilityToExcelRows` in `src/utils/exportFinancialReports.ts`.
- Implemented Task 3:
  - Added 3-pillar KPI summary cards at top of `JobProfitabilityTab.tsx`.
  - Added dedicated table columns (`Profit Paket (BOM)`, `Profit Mat. Granular`, `Profit Jasa & FOH`) and footer aggregates.
- Implemented Task 4:
  - Added 3-pillar segregated profit calculations in `RabCalculator.tsx`.
  - Added sub-breakdown cards (`Sub-Rincian Profitabilitas RAB (3 Pilar)`) in the summary footer.
  - Displayed `grossMarginPercentage` next to nominal margin.
- Implemented Task 5:
  - Added 3-pillar segregated profit calculations for draft items in `AmendmentManager.tsx`.
  - Added sub-breakdown cards (`Sub-Rincian Profitabilitas CO (3 Pilar)`) before final totals.
- Implemented Task 6:
  - Added tests in `src/services/__tests__/financialReportsService.test.ts`.
  - Added tests in `src/utils/__tests__/exportFinancialReports.test.ts`.
  - Added tests in `src/components/finance/tabs/__tests__/JobProfitabilityTab.test.tsx`.
  - Added tests in `src/components/__tests__/RabCalculatorLabor.test.tsx`.
  - Updated assertions in `src/components/__tests__/AmendmentManager.test.tsx`.
  - Fixed linting unused parameter in `src/services/rabService.ts`.
  - Passed full quality gate:
    - Vitest: 60 suites, 423 tests passing (100% green).
    - Oxlint: 0 warnings, 0 errors.
    - TypeScript: `tsc -b` clean.
    - Production build: `npm run build` completed in 425ms.
