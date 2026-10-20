# Sprint 49 — Add Detailed Itemized Breakdown for Approved Change Orders in Kasir Billing Calculator

> **Duration**: 2026-10-20 to 2026-10-21
> **Status**: Completed ✅

## Goal
Implement a transparent itemized breakdown for approved Change Orders (Addendums) in the Kasir Billing Calculator (`/kasir`), featuring an accordion toggle directly on the Customer Billing card with dispute-protection metadata (WBS stage, approval date/status, unit prices, subtotals), and automatically mapping this breakdown into the final bill printable invoice payload.

## Scope

### Included
- **Data Layer (`src/services/billingService.ts`)**:
  - Defined data contracts: `ApprovedChangeOrder`, `ApprovedChangeOrderItem`, and `InvoicePrintPayload`.
  - Implemented `fetchApprovedChangeOrders(spkDbId: string)` querying `change_orders` with nested `change_order_items` (`item_name`, `item_type`, `wbs_stage`, `quantity`, `unit`, `unit_price`, `cost_price`, `subtotal`, `notes`), with resilient fallback to `spk_amendments`.
- **Print & Export Engine (`src/utils/invoiceExport.ts`)**:
  - Implemented `buildInvoicePrintPayload(...)` mapping SPK base contract, approved change orders itemized breakdown, and manual adjustments.
  - Implemented `printFinalInvoice(payload: InvoicePrintPayload)` rendering a comprehensive, print-optimized invoice document complete with customer details, WBS-aligned change order addendum breakdown, totals, and legal verification signatures.
- **Kasir Dashboard UI (`src/pages/KasirDashboard.tsx`)**:
  - Automatically fetches approved change orders when an SPK is selected.
  - Upgraded Customer Billing card with an interactive accordion / collapsible toggle under `Change Orders (Addendum)`.
  - Displays legal protection metadata: CO Number, description, WBS stage, approval timestamp, status badge (`APPROVED`), and itemized table of change order items.
  - Enriched invoice confirmation modal to display itemized change order counts and subtotals.
  - Provided a direct "Cetak Invoice" action for UNPAID and LUNAS invoices, and wired "Cetak Dokumen Sekarang" to `printFinalInvoice`.
- **Automated Testing & Quality Verification**:
  - Unit tests for `fetchApprovedChangeOrders` in `src/services/__tests__/billingService.test.ts` (4/4 tests passing).
  - Unit tests for `buildInvoicePrintPayload` and `printFinalInvoice` in `src/utils/__tests__/invoiceExport.test.ts` (4/4 tests passing).
  - Component tests for Kasir change order accordion toggle and print actions in `src/components/__tests__/KasirChangeOrderBreakdown.test.tsx` (2/2 tests passing).
  - Full Vitest suite: 29/29 test suites passing (188/188 tests, 100%).
  - Linter: 0 warnings, 0 errors across 149 files (Oxlint).
  - TypeScript: Clean static compilation (`npx tsc -b`).
  - Production build: Clean Vite bundle generated in 2.03s (`npm run build`).

### Explicitly Excluded
- Modifying `AmendmentManager.tsx` creation or approval workflow.
- Modifying Gate 2 warehouse budget logic or Mandor portal submissions.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Update data fetching & contracts in `billingService.ts` | Antigravity | ✅ Done | 0.3h |
| 2. Implement invoice printable payload & engine in `invoiceExport.ts` | Antigravity | ✅ Done | 0.3h |
| 3. Integrate itemized accordion & print actions in `KasirDashboard.tsx` | Antigravity | ✅ Done | 0.5h |
| 4. Write unit and component tests & verify end-to-end quality | Antigravity | ✅ Done | 0.4h |

## Daily Log

### 2026-10-20
- Initialized Sprint 49: Add Detailed Itemized Breakdown for Approved Change Orders in Kasir Billing Calculator.
- Archived Sprint 48 to `.gsd/sprints/sprint-48-refactor-gate-2-warehouse-approval-budget-guard-to-material-only-and-wbs-specific-scope.md`.
- Implemented `fetchApprovedChangeOrders` in `src/services/billingService.ts` fetching `change_orders` with nested `change_order_items` (`item_name`, `item_type`, `wbs_stage`, `quantity`, `unit_price`, `subtotal`), with fallback to `spk_amendments`.
- Implemented `src/utils/invoiceExport.ts` providing `buildInvoicePrintPayload`, `formatCurrency`, and `printFinalInvoice` with itemized change order tables, dispute protection statements, and dual signatures.
- Upgraded `src/pages/KasirDashboard.tsx`:
  - Added hook loading approved change orders on SPK selection.
  - Replaced static Change Orders row with an interactive collapsible accordion badge and table.
  - Rendered legal dispute protection card with item names, types, WBS stages, quantities, unit prices, and subtotals.
  - Added "Cetak Invoice" button to action bar for UNPAID and LUNAS statuses.
  - Wired "Cetak Dokumen Sekarang" in post-generation modal to trigger `printFinalInvoice`.
- Created unit and component tests:
  - `src/services/__tests__/billingService.test.ts` (4 tests passing)
  - `src/utils/__tests__/invoiceExport.test.ts` (4 tests passing)
  - `src/components/__tests__/KasirChangeOrderBreakdown.test.tsx` (2 tests passing)
- Full regression verification: 29/29 test suites passing (188/188 tests, 100%).
- Oxlint: 0 errors, 0 warnings across 149 files.
- TypeScript compilation and Vite production build passed cleanly.
