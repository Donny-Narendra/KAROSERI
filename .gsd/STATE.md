## Current Position
- **Sprint**: Sprint 97 — Fix Stale OPEX State and Ensure Immediate Chart Re-rendering on Expense Deletion
- **Status**: Sprint completed ✓
- **Milestone**: Core Business Recommendations Hardening — Enterprise Production Readiness

## Last Session Summary
- Sprint 97 completed:
  * Modal Event Trigger (`OperatingExpenseManagerModal.tsx` & `OpexLoggingModal.tsx`):
    - Added `onExpenseChanged?: () => void` and `currentMonth?: string` to props interface.
    - Updated `handleDeleteExpense` to execute Supabase `DELETE`, immediately filter local state list (`setExpenses(prev => prev.filter(...))`), and trigger `onExpenseChanged?.()`.
    - Updated `handleCreateSubmit` to invoke `onExpenseChanged?.()`.
  * Centralized Refetch Pipeline (`FinancialReportsPage.tsx` & `CorporatePnlTab.tsx`):
    - Implemented `handleRefreshAllFinancialData` combining `fetchExecutiveSummary()`, `fetchJobProfitability()`, `fetchCorporatePnL()`, and `fetchWbsVariance()`.
    - Passed `onExpenseChanged={handleRefreshAllFinancialData}` to `OperatingExpenseManagerModal` and `CorporatePnlTab`.
    - Wired `CorporatePnlTab`'s internal modal to trigger parent refetch, ensuring Executive KPI cards, Corporate P&L, CVP Solver, and charts update simultaneously without hard reload.
    - Added header shortcut button for OPEX management.
  * Chart Reactivity (`CorporatePnLCharts.tsx`):
    - Recomputed `chartSeries`, `sortedData`, donut metrics, and SVG paths reactively via `useMemo`.
    - Ensured bottom summary labels reactively display for active/hovered month:
      * Omzet Penjualan: `formatRupiah(activeMonthData.total_revenue)`
      * HPP + OPEX: `formatRupiah(activeMonthData.total_cogs + activeMonthData.total_opex)`
      * Laba Bersih (EBIT): `formatRupiah(activeMonthData.net_operating_profit)`
  * Testing & Verification:
    - Updated `OperatingExpenseManagerModal.test.tsx` (7 tests green) testing deletion callback, local state update, confirmation alert, and creation.
    - Created `CorporatePnLCharts.test.tsx` (4 tests green) testing instant re-rendering without reload upon OPEX deletion.
    - Ran full test suite: 73 test files passed (527 tests green).
    - Ran oxlint: 0 errors.
    - Production build: `tsc -b && vite build` succeeded in 500ms.

## Next Up
- Sprint 97 ready to close or proceed with next request.
