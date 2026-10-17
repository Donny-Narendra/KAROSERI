# Sprint 36 — Integrate 3-Element Job Order Costing into Financial Reports UI and KPI Cards

> **Duration**: 2026-10-17 to 2026-10-17
> **Status**: Completed ✅

## Goal
Integrate 3-element Job Order Costing (Direct Material, Direct Labor, Factory Overhead) proportionally into the `/finance-reports` user interface:
1. Executive summary KPI cards (`ExecutiveKpiCards.tsx`) with dedicated Card 4 for `total_actual_overhead_cost` (Overhead Pabrikasi FOH).
2. WBS Cost Variance tab (`WbsCostVarianceTab.tsx`) with 3 overhead analytical columns (`Pagu FOH`, `Realisasi FOH`, `Varian FOH`) alongside Material and Labor.
3. Job Profitability tab (`JobProfitabilityTab.tsx`) with Biaya Overhead (FOH) column and 3-element HPP/COGS formula.
4. Printable Financial Report (`FinancialPrintReport.tsx`) with overhead sections and columns.
5. Unit tests (`ExecutiveKpiCards.test.tsx`, `executiveKpiCalculations.test.ts`) covering 6-card layout, skeleton loading, and percentage thresholds.

## Scope

### Included
- **TypeScript Types & Contracts (`src/types/financialReports.ts`)**:
  - `FinancialExecutiveSummary`: `total_actual_overhead_cost: number;`
  - `WbsCostVariance`: `total_overhead_budget: number; actual_overhead_spent: number; overhead_variance: number;`
  - `SpkJobProfitability`: `actual_overhead_cost: number;`
  - Type aliases `WbsCostVarianceItem = WbsCostVariance` and `SpkJobProfitabilityItem = SpkJobProfitability`.
- **UI Components & Reporting Tabs**:
  - `ExecutiveKpiCards.tsx`: Expanded top-row executive cards to 6 decoupled cards (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6`), adding Card 4 for Overhead Pabrikasi (FOH) with `Factory` icon and proportion against Omzet.
  - `WbsCostVarianceTab.tsx`: Added 3 analytical columns (`Pagu FOH`, `Realisasi FOH`, `Varian FOH`), updated row calculations for 3-way variance status (`totalVar = matVar + laborVar + overheadVar`), and formatted table footer totals with colSpan=12.
  - `JobProfitabilityTab.tsx`: Added `Biaya Overhead (FOH)` column, row cells, and summary footer totals.
  - `FinancialPrintReport.tsx`: Synchronized printable Executive Summary, Job Profitability, and WBS Cost Variance tables with overhead metrics.
- **Testing & Verification**:
  - Updated `ExecutiveKpiCards.test.tsx` to assert 6 skeleton loading cards and all 6 financial KPI metrics with regex word boundary safety.
  - Added unit test in `executiveKpiCalculations.test.ts` for 3-element COGS reconciliation.
  - Ran 15 Vitest test suites (123 tests passing), Oxlint (0 errors), and production build (`npm run build` passing).

### Explicitly Excluded
- Database view and RPC modifications (completed in Sprint 35).
- Physical bay sensor tracking or automated IoT logging hardware.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Update TypeScript contracts (`FinancialExecutiveSummary`, `WbsCostVarianceItem`, `SpkJobProfitabilityItem`) | Antigravity | ✅ Done | 0.2h |
| 2. Update `ExecutiveKpiCards.tsx` to 6-card grid with Card 4 Overhead Pabrikasi (FOH) | Antigravity | ✅ Done | 0.3h |
| 3. Update `WbsCostVarianceTab.tsx` with 3 FOH analytical columns and 3-way variance status | Antigravity | ✅ Done | 0.3h |
| 4. Update `JobProfitabilityTab.tsx` and `FinancialPrintReport.tsx` with Overhead FOH columns | Antigravity | ✅ Done | 0.2h |
| 5. Update unit tests (`ExecutiveKpiCards.test.tsx`, `executiveKpiCalculations.test.ts`) and verify with build | Antigravity | ✅ Done | 0.3h |

## Daily Log

### 2026-10-17
- Initialized Sprint 36 for UI integration of 3-Element Job Order Costing across the `/finance-reports` dashboard.
- Verified TypeScript contracts in `src/types/financialReports.ts` including aliases `WbsCostVarianceItem` and `SpkJobProfitabilityItem`.
- Implemented Card 4 "Overhead Pabrikasi (FOH)" in `ExecutiveKpiCards.tsx`, expanding responsive layout to 6 cards.
- Integrated `Pagu FOH`, `Realisasi FOH`, and `Varian FOH` into `WbsCostVarianceTab.tsx` with deficit/surplus status.
- Added `Biaya Overhead (FOH)` into `JobProfitabilityTab.tsx` and updated printable canvas in `FinancialPrintReport.tsx`.
- Updated test suite in `ExecutiveKpiCards.test.tsx` to validate 6 skeleton cards and metrics.
- Added 3-element COGS reconciliation test in `src/utils/__tests__/executiveKpiCalculations.test.ts`.
- Ran full test suite: 15 suites, 123 tests passing (100%).
- Ran Oxlint: 0 errors.
- Ran production build: `npm run build` succeeded cleanly.
