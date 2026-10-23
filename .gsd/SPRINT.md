# Sprint 82 — Comprehensive Profit Segregation (Assembly Package vs Granular Items) across RAB, Change Orders, and Financial Reports

> **Duration**: 2026-10-23 to 2026-10-24
> **Status**: In Progress

## Goal
Implement comprehensive 3-pillar profit segregation (Finished Goods Assembly BOM Package profit vs Granular Raw Material markup profit vs Granular Labor & Overhead margin) across the database reporting layer (`view_spk_job_profitability`), financial reporting UI & Excel/CSV exports, RAB Calculator, and Change Order form (incorporating both baseline RAB items and approved Change Orders).

## Scope

### Included
- **Task 1: Database Migration & Reporting View Layer (`view_spk_job_profitability`)**
  - Create migration `20261024020000_segregate_package_and_granular_profit.sql` aggregating items from `rab_items` and approved `change_order_items`.
  - Calculate segregated revenue, COGS, and profit for:
    1. Finished goods assembly package (`package_revenue`, `package_cogs`, `package_profit`).
    2. Granular raw material (`granular_mat_revenue`, `granular_mat_cogs`, `granular_material_profit`).
    3. Granular labor & overhead (`granular_other_revenue`, `granular_other_cogs`, `granular_other_profit`).
    4. Accumulative totals (`total_revenue`, `total_cogs`, `gross_profit`, `gross_margin_percentage`).
  - Maintain backward compatibility for `actual_material_cost`, `actual_labor_cost`, `actual_overhead_cost`, and `payment_status` to ensure dependent corporate views (`view_corporate_monthly_pnl`) and executive summary RPCs remain fully operational.
  - Exclude `DRAFT` and `PENDING_PAYMENT` SPKs.
- **Task 2: Financial Reporting Service Layer & Type Contracts**
  - Update `SpkJobProfitability` interface in `src/types/financialReports.ts` with new segregated profit columns.
  - Update `financialReportsService.ts` (`getJobProfitability`) to parse and normalize segregated fields as numbers.
  - Update `exportFinancialReports.ts` to include segregated profit breakdown columns in Excel and CSV reports.
- **Task 3: Financial Reports UI Module (`JobProfitabilityTab.tsx`)**
  - Update `JobProfitabilityTab.tsx` table headers, rows, and footer aggregates to display:
    - Profit Paket Assembly (`package_profit`).
    - Profit Material Granular (`granular_material_profit`).
    - Profit Jasa & Overhead (`granular_other_profit`).
  - Add tooltips and visual distinctions for assembly vs granular earnings.
- **Task 4: RAB Calculator Financial Summary Sub-Breakdown (`RabCalculator.tsx`)**
  - Compute live segregated profit metrics in `RabCalculator.tsx`:
    - Package BOM Profit: `Σ (selling_price - cost_price)` for package components.
    - Granular Material Markup: `Σ (selling_price - cost_price)` for non-package material items.
    - Granular Labor & Overhead Profit: `Σ (selling_price - cost_price)` for non-package labor and overhead items.
  - Display clear sub-breakdown cards in the financial summary section.
- **Task 5: Change Order Form Financial Summary Sub-Breakdown (`AmendmentManager.tsx`)**
  - Compute live segregated profit metrics for draft items in `AmendmentManager.tsx`.
  - Display sub-breakdown cards (Profit Paket, Profit Material Granular, Profit Jasa & Overhead) in the financial summary panel.
- **Task 6: Testing & Quality Gate Verification**
  - Add test suites in `financialReportsService.test.ts`, `JobProfitabilityTab.test.tsx`, `exportFinancialReports.test.ts`, `RabCalculatorLabor.test.tsx`, and `AmendmentManager.test.tsx`.
  - Pass full quality gate: TypeScript (`tsc -b`), Oxlint (0 errors, 0 warnings), Vitest (100% passing), and production build (`npm run build`).

### Explicitly Excluded
- Altering physical inventory reservation logic in warehouse approvals.
- Modifying cashflow / payment receipt ledger posting procedures.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Create SQL migration `20261024020000_segregate_package_and_granular_profit.sql` | Antigravity | ⏳ In Progress | 0.5h |
| 2. Update financial reporting types, service layer, and Excel/CSV exporters | Antigravity | ⬜ Todo | 0.5h |
| 3. Update `JobProfitabilityTab.tsx` UI with segregated profit columns and summary totals | Antigravity | ⬜ Todo | 0.5h |
| 4. Update `RabCalculator.tsx` financial summary with segregated profit cards | Antigravity | ⬜ Todo | 0.5h |
| 5. Update `AmendmentManager.tsx` financial summary with segregated profit cards | Antigravity | ⬜ Todo | 0.5h |
| 6. Add automated tests and verify full quality gates | Antigravity | ⬜ Todo | 0.5h |

## Daily Log

### 2026-10-23
- Archived Sprint 81 into `.gsd/sprints/sprint-81-allow-multi-instance-package-selection-in-change-orders.md`.
- Initialized Sprint 82: Comprehensive Profit Segregation across RAB, Change Orders, and Financial Reports.
- Analyzed database view `view_spk_job_profitability`, `financialReportsService.ts`, `JobProfitabilityTab.tsx`, `RabCalculator.tsx`, and `AmendmentManager.tsx`.
