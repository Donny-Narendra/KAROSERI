# Sprint 42 — Implement Periodic OPEX Accounting, Empirical PnL Charts, and Smart Target Solver Engine

> **Duration**: 2026-10-18 to 2026-10-19
> **Status**: In Progress 🚀

## Goal
Implement a complete Periodic Operating Expense (OPEX) Accounting system, Empirical Corporate P&L Analytics with visual charts, and a Smart Sales Target Solver (CVP Optimization Engine) for workshop management and executive financial reporting:
1. **Laporan Laba Rugi Komprehensif Perusahaan (Corporate P&L)**:
   - Database migration with `operating_expense_categories`, `operating_expenses`, and `view_corporate_monthly_pnl`.
   - Full TypeScript data contracts and Supabase client service layer for OPEX transactions & monthly corporate profitability aggregation.
   - Comprehensive UI tab with monthly EBIT summary, expense ledger, and OPEX entry modal.
2. **Grafik Empiris Analisis Laba Rugi**:
   - Visual multi-series trend comparison of Revenue vs COGS vs OPEX vs Net Operating Profit.
   - Empirical Cost Breakdown Doughnut/Ring Chart (Material vs Labor vs Overhead vs OPEX).
3. **Smart Sales Target Solver (CVP Optimization Engine)**:
   - Interactive Cost-Volume-Profit (CVP) solver calculating Break-Even Point (BEP Units & Rupiah), Contribution Margin (CM), and Target Omzet to hit desired owner profit.
   - Sensitivity scenario matrix and Margin of Safety (MoS) indicators.
4. **Export, Print & Full Regression Verification**:
   - Multi-sheet Excel workbook export & print report integration for Corporate P&L.
   - 100% test suite pass rate, 0 Oxlint warnings, clean `tsc -b` compilation.

## Scope

### Included
- Migration: `supabase/migrations/20261018010000_periodic_opex_and_pnl.sql`.
- Migration executor execution and database verification.
- Types: `src/types/financialReports.ts`.
- Service: `src/services/financialReportsService.ts`.
- Calculations utility: `src/utils/cvpCalculations.ts` with unit test suite.
- Components:
  - `src/components/finance/tabs/CorporatePnlTab.tsx`
  - `src/components/finance/OpexExpenseModal.tsx`
  - `src/components/finance/charts/PnlTrendChart.tsx`
  - `src/components/finance/charts/CostBreakdownDoughnut.tsx`
  - `src/components/finance/SmartTargetSolver.tsx`
- Integration into `src/pages/FinancialReportsPage.tsx`, `src/utils/exportFinancialReports.ts`, and `src/components/finance/FinancialPrintReport.tsx`.
- Unit tests in `src/utils/__tests__/cvpCalculations.test.ts` and `src/components/finance/__tests__/CorporatePnlTab.test.tsx`.

### Explicitly Excluded
- External third-party heavy charting packages (using zero-dependency, ultra-crisp responsive SVG charts with dark/light theme tokens and micro-interactions).

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Database migration `20261018010000_periodic_opex_and_pnl.sql` & apply via `apply_migration.cjs` | Antigravity | ⬜ Todo | 0.4h |
| 2. TypeScript contracts & Service Layer (`financialReports.ts` & `financialReportsService.ts`) | Antigravity | ⬜ Todo | 0.4h |
| 3. CVP Optimization Engine & Math Utils (`cvpCalculations.ts` + tests) | Antigravity | ⬜ Todo | 0.5h |
| 4. Empirical Visual Charts (`PnlTrendChart.tsx` & `CostBreakdownDoughnut.tsx`) | Antigravity | ⬜ Todo | 0.6h |
| 5. OPEX Entry Modal & Expense Ledger (`OpexExpenseModal.tsx`) | Antigravity | ⬜ Todo | 0.5h |
| 6. Smart Target Solver Component (`SmartTargetSolver.tsx`) | Antigravity | ⬜ Todo | 0.5h |
| 7. Corporate P&L Tab & FinancialReportsPage Integration | Antigravity | ⬜ Todo | 0.6h |
| 8. Export to Excel/CSV & Print Report Integration | Antigravity | ⬜ Todo | 0.4h |
| 9. Regression testing, Oxlint validation, and build verification | Antigravity | ⬜ Todo | 0.3h |

## Daily Log

### 2026-10-18
- Initialized Sprint 42 for Periodic OPEX Accounting, Empirical PnL Charts, and Smart Target Solver Engine.
