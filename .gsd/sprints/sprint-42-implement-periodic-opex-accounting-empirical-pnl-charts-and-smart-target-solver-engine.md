# Sprint 42 — Implement Periodic OPEX Accounting, Empirical PnL Charts, and Smart Target Solver Engine

> **Duration**: 2026-10-18 to 2026-10-18
> **Status**: Completed ✅

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
   - 100% test suite pass rate (20/20 test suites, 147/147 tests passing), 0 Oxlint warnings across 131 files, clean `tsc -b` compilation.

## Scope

### Included
- Migration: `supabase/migrations/20261018010000_periodic_opex_and_pnl.sql`.
- Migration executor execution and database verification via PostgreSQL client.
- Types: `src/types/financialReports.ts`.
- Service: `src/services/financialReportsService.ts`.
- Calculations utility: `src/utils/cvpCalculations.ts` with unit test suite.
- Formatters utility: `src/utils/formatters.ts`.
- Components:
  - `src/components/finance/tabs/CorporatePnlTab.tsx`
  - `src/components/finance/OpexExpenseModal.tsx`
  - `src/components/finance/charts/PnlTrendChart.tsx`
  - `src/components/finance/charts/CostBreakdownDoughnut.tsx`
  - `src/components/finance/SmartTargetSolver.tsx`
- Integration into `src/pages/FinancialReportsPage.tsx`, `src/utils/exportFinancialReports.ts`, and `src/components/finance/FinancialPrintReport.tsx`.
- Unit tests in `src/utils/__tests__/cvpCalculations.test.ts`, `src/utils/__tests__/exportFinancialReports.test.ts`, and `src/components/finance/tabs/__tests__/CorporatePnlTab.test.tsx`.

### Explicitly Excluded
- External third-party heavy charting packages (using zero-dependency, ultra-crisp responsive SVG charts with dark/light theme tokens and micro-interactions).

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Database migration `20261018010000_periodic_opex_and_pnl.sql` & apply via `apply_migration.cjs` | Antigravity | ✅ Done | 0.4h |
| 2. TypeScript contracts & Service Layer (`financialReports.ts` & `financialReportsService.ts`) | Antigravity | ✅ Done | 0.4h |
| 3. CVP Optimization Engine & Math Utils (`cvpCalculations.ts` + tests) | Antigravity | ✅ Done | 0.5h |
| 4. Empirical Visual Charts (`PnlTrendChart.tsx` & `CostBreakdownDoughnut.tsx`) | Antigravity | ✅ Done | 0.6h |
| 5. OPEX Entry Modal & Expense Ledger (`OpexExpenseModal.tsx`) | Antigravity | ✅ Done | 0.5h |
| 6. Smart Target Solver Component (`SmartTargetSolver.tsx`) | Antigravity | ✅ Done | 0.5h |
| 7. Corporate P&L Tab & FinancialReportsPage Integration | Antigravity | ✅ Done | 0.6h |
| 8. Export to Excel/CSV & Print Report Integration | Antigravity | ✅ Done | 0.4h |
| 9. Regression testing, Oxlint validation, and build verification | Antigravity | ✅ Done | 0.3h |

## Daily Log

### 2026-10-18
- Initialized Sprint 42 for Periodic OPEX Accounting, Empirical PnL Charts, and Smart Target Solver Engine.
- Authored and applied database migration `supabase/migrations/20261018010000_periodic_opex_and_pnl.sql`:
  - Created `operating_expense_categories` table with 6 default seed categories.
  - Created `operating_expenses` table with indexes, RLS policies, and effective_month field.
  - Created `view_corporate_monthly_pnl` consolidating SPK revenues, 3-element COGS (material, labor, overhead), and period OPEX to generate monthly EBIT & net margin %.
- Verified database tables and view directly via pg client (`Categories count: 6`, `Corporate PnL rows: 1`).
- Expanded TypeScript contracts in `src/types/financialReports.ts` (`OperatingExpenseCategory`, `OperatingExpense`, `CreateOperatingExpensePayload`, `OperatingExpenseFilter`, `CorporateMonthlyPnl`).
- Implemented full OPEX and Corporate P&L service methods in `src/services/financialReportsService.ts`.
- Developed `src/utils/cvpCalculations.ts` implementing unit contribution margin, contribution margin ratio, break-even point in units and rupiah, target profit units/revenue, margin of safety (MoS), and 6-scenario sensitivity analysis matrix.
- Created unit tests in `src/utils/__tests__/cvpCalculations.test.ts` (5/5 tests passing).
- Created `src/utils/formatters.ts` for clean Indonesian Rupiah currency formatting.
- Built bespoke responsive SVG charts:
  - `src/components/finance/charts/PnlTrendChart.tsx`: Multi-series trend chart with legend series toggles, bar groups, hover tooltip card, and net margin badges.
  - `src/components/finance/charts/CostBreakdownDoughnut.tsx`: Interactive 4-element cost structure ring chart (Material vs Labor vs Overhead vs OPEX) with center totals and hover slice inspect.
- Built `src/components/finance/OpexExpenseModal.tsx`:
  - Input mode with category select, effective month, expense date, payment method (Transfer/Cash), receipt reference, and live formatted preview.
  - List mode displaying monthly OPEX ledger, category tags, delete transaction confirmation, and monthly total chip.
- Built `src/components/finance/SmartTargetSolver.tsx`:
  - Interactive CVP calculator with owner desired profit, preset buttons, auto-populated OPEX and SPK averages.
  - Live BEP cards, Target Omzet/Units, Contribution Margin Ratio %, Margin of Safety %, and sensitivity scenario matrix table.
- Built `src/components/finance/tabs/CorporatePnlTab.tsx`:
  - Executive summary cards (Total Revenue, Total COGS, Gross Profit, Total OPEX, Net Operating Profit EBIT).
  - Integrated empirical charts and Smart Target Solver.
  - Corporate monthly P&L table with expandable detail drawers for COGS and OPEX breakdown.
- Integrated into `src/pages/FinancialReportsPage.tsx`:
  - Added 5th tab "5. Laba Rugi Perusahaan & Target Solver (Corporate P&L)".
  - Integrated Corporate PnL into single tab Excel/CSV export and Full Financial Workbook (.xlsx).
  - Added Corporate P&L section to formal printable PDF report in `src/components/finance/FinancialPrintReport.tsx`.
- Added unit tests in `src/utils/__tests__/exportFinancialReports.test.ts` and `src/components/finance/tabs/__tests__/CorporatePnlTab.test.tsx` (4/4 tests passing).
- Verified full regression:
  - **20/20 Vitest test suites passing (147/147 tests 100% pass)**.
  - **0 Oxlint warnings and 0 errors across 131 files**.
  - **Clean TypeScript compilation (`tsc -b`)**.
  - **Production bundle generated cleanly in 532ms**.
