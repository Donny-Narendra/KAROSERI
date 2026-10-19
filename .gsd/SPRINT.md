# Sprint 49 — Add Detailed Itemized Breakdown for Approved Change Orders in Kasir Billing Calculator

> **Duration**: 2026-10-20 to 2026-10-21
> **Status**: In Progress 🟡

## Goal
Implement a transparent itemized breakdown for approved Change Orders (Addendums) in the Kasir Billing Calculator (`/kasir`), featuring an accordion toggle directly on the Customer Billing card with dispute-protection metadata (WBS stage, approval date/status, unit prices, subtotals), and automatically mapping this breakdown into the final bill printable invoice payload.

## Scope

### Included
- **Data Layer (`src/services/billingService.ts`)**:
  - Define data contracts: `ApprovedChangeOrder`, `ApprovedChangeOrderItem`, and `InvoicePrintPayload`.
  - Implement `fetchApprovedChangeOrders(spkDbId: string)` querying `change_orders` with nested `change_order_items` (`item_name`, `item_type`, `wbs_stage`, `quantity`, `unit`, `unit_price`, `cost_price`, `subtotal`, `notes`), with resilient fallback to `spk_amendments`.
- **Print & Export Engine (`src/utils/invoiceExport.ts`)**:
  - Implement `buildInvoicePrintPayload(...)` mapping SPK base contract, approved change orders itemized breakdown, and manual adjustments.
  - Implement `printFinalInvoice(payload: InvoicePrintPayload)` rendering a comprehensive, print-optimized invoice document complete with customer details, WBS-aligned change order addendum breakdown, totals, and legal verification signatures.
- **Kasir Dashboard UI (`src/pages/KasirDashboard.tsx`)**:
  - Automatically fetch approved change orders when an SPK is selected.
  - Upgrade the Customer Billing card with an interactive accordion / collapsible toggle under `Change Orders (Addendum)`.
  - Display legal protection metadata: CO Number, description, WBS stage, approval timestamp, status badge (`APPROVED`), and itemized table of change order items.
  - Enrich invoice confirmation modal to display itemized change order counts and subtotals.
  - Provide a direct "Cetak Invoice" action for UNPAID and LUNAS invoices, and wire "Cetak Dokumen Sekarang" to `printFinalInvoice`.
- **Automated Testing & Quality Verification**:
  - Unit tests for `fetchApprovedChangeOrders`, `buildInvoicePrintPayload`, and `printFinalInvoice`.
  - Component tests for Kasir change order accordion toggle and invoice generation workflow.
  - Full Vitest suite, TypeScript compilation, Oxlint hygiene, and Vite build validation.

### Explicitly Excluded
- Modifying `AmendmentManager.tsx` creation or approval workflow.
- Modifying Gate 2 warehouse budget logic or Mandor portal submissions.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Update data fetching & contracts in `billingService.ts` | Antigravity | ⬜ Todo | 0.3h |
| 2. Implement invoice printable payload & engine in `invoiceExport.ts` | Antigravity | ⬜ Todo | 0.3h |
| 3. Integrate itemized accordion & print actions in `KasirDashboard.tsx` | Antigravity | ⬜ Todo | 0.5h |
| 4. Write unit and component tests & verify end-to-end quality | Antigravity | ⬜ Todo | 0.4h |

## Daily Log

### 2026-10-20
- Initialized Sprint 49: Add Detailed Itemized Breakdown for Approved Change Orders in Kasir Billing Calculator.
- Archived Sprint 48 to `.gsd/sprints/sprint-48-refactor-gate-2-warehouse-approval-budget-guard-to-material-only-and-wbs-specific-scope.md`.
- Verified pre-sprint baseline: 26/26 test suites passing (178/178 tests, 100%).
