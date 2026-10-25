# Sprint 97 — Fix Stale OPEX State and Ensure Immediate Chart Re-rendering on Expense Deletion

> **Duration**: 2026-10-25 to 2026-10-25
> **Status**: Completed ✓

## Goal
Fix stale OPEX state and ensure immediate chart and financial reports re-rendering when operating expense items are created or deleted in the OPEX manager modal.

## Scope

### Included
- **Task 1: Event Callbacks in `OperatingExpenseManagerModal.tsx` & `OpexLoggingModal.tsx`**
  - Added `onExpenseChanged?: () => void` and `currentMonth?: string` to `OperatingExpenseManagerModalProps` and `OpexLoggingModalProps`.
  - In `handleDeleteExpense`: executed Supabase `DELETE` on `operating_expenses`, filtered out deleted item from local `expenses` list state immediately, and triggered `onExpenseChanged()` and `onExpenseAdded()`.
  - In `handleCreateSubmit`: saved expense, reloaded expenses, and triggered `onExpenseChanged()` and `onExpenseAdded()`.
  - Supported `currentMonth` and `defaultMonth` synchronizing active month state.
- **Task 2: Centralized Refetch in `FinancialReportsPage.tsx` & `CorporatePnlTab.tsx`**
  - Implemented `handleRefreshAllFinancialData` combining `fetchExecutiveSummary()`, `fetchJobProfitability()`, `fetchCorporatePnL()`, and `fetchWbsVariance()`.
  - Connected `onExpenseChanged={handleRefreshAllFinancialData}` to `OperatingExpenseManagerModal` in `FinancialReportsPage.tsx`.
  - Passed `onExpenseChanged` prop to `CorporatePnlTab.tsx` and wired its internal OPEX modal to invoke parent refetch, updating Executive KPI cards, Corporate P&L, CVP Solver, and charts simultaneously.
  - Added "Kelola OPEX" shortcut button in header for rapid access.
- **Task 3: Reactive Metrics and Bottom Labels in `CorporatePnLCharts.tsx`**
  - Supported both `pnlData` and `data` props.
  - Recomputed `chartSeries`, `sortedData`, `donutMetrics`, and SVG dimensions reactively via `useMemo`.
  - Guaranteed bottom summary labels display reactive metrics for active / hovered month:
    * Omzet Penjualan: `formatRupiah(activeMonthData.total_revenue)`
    * HPP + OPEX: `formatRupiah(activeMonthData.total_cogs + activeMonthData.total_opex)`
    * Laba Bersih (EBIT): `formatRupiah(activeMonthData.net_operating_profit)`
- **Task 4: Automated Testing & Verification**
  - Added unit tests in `src/components/finance/__tests__/OperatingExpenseManagerModal.test.tsx` verifying deletion callback, local state removal, confirmation modal, and create callback.
  - Created `src/components/finance/__tests__/CorporatePnLCharts.test.tsx` testing empty state, `pnlData` prop, bottom summary labels, and instant re-rendering without reload upon expense deletion.
  - Verified all 73 test suites passed (527 tests green), 0 oxlint errors, and successful production build.

### Explicitly Excluded
- Altering database schema or double-entry journal ledger schema.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| Task 1: Add onExpenseChanged and currentMonth in OperatingExpenseManagerModal & OpexLoggingModal | Claude | ✅ Done | 0.5 |
| Task 2: Connect centralized handleRefreshAllFinancialData in FinancialReportsPage & CorporatePnlTab | Claude | ✅ Done | 0.5 |
| Task 3: Reactive useMemo chart metrics & bottom labels in CorporatePnLCharts | Claude | ✅ Done | 0.5 |
| Task 4: Unit tests & empirical verification | Claude | ✅ Done | 0.5 |

## Daily Log

### 2026-10-25
- Sprint 97 completed.
- Solved stale OPEX state bug:
  1. Updated `OperatingExpenseManagerModal` & `OpexLoggingModal` to trigger `onExpenseChanged` on deletion and creation.
  2. Integrated `handleRefreshAllFinancialData` across `FinancialReportsPage.tsx` and `CorporatePnlTab.tsx`.
  3. Recomputed `CorporatePnLCharts` series, donut basis, and bottom labels reactively via `useMemo`.
  4. Verified all 73 test suites pass (527 tests green), zero lint errors, and production build succeeded.

## Retrospective (2026-10-25)

### What Went Well
- Immediate feedback loop with reactive callbacks without full page reloads.
- Visual charts and summaries update in real-time when expenses are added or deleted.

### What Could Improve
- UI overflow testing across different desktop viewports to catch layout clipping early.

### Action Items
- [ ] Fix KPI Margin Badge Overflow on Desktop Viewport in Executive Dashboard.
