## Current Position
- **Sprint**: Sprint 49 — Add Detailed Itemized Breakdown for Approved Change Orders in Kasir Billing Calculator
- **Status**: In Progress 🟡
- **Milestone**: Core Business Recommendations Hardening — Enterprise Production Readiness

## Last Session Summary
Completed Sprint 48 refactoring Gate 2 Warehouse Approval budget limit evaluation to strictly material-only and WBS-specific scope:
1. **Gate 2 Calculation Engine (`src/utils/gate2BudgetValidation.ts`)**:
   - Implemented `normalizeWbsStage` and `matchWbsStage` to handle both `'WBS 1: Pembongkaran'` and `'Pembongkaran'` variants.
   - Implemented `getWbsMaterialBudget` summing pure material items (`item_type === 'MATERIAL' || !item_type`) from `rab_items` and approved `change_order_items`, strictly excluding labor and overhead.
   - Implemented `getWbsMaterialCommitted` summing approved material requisitions and direct material issues for the targeted WBS stage.
   - Implemented `evaluateGate2Budget` providing comprehensive breakdown: `wbsBudgetLimit`, `approvedReqCost`, `directIssueCost`, `currentTicketCost`, `projectedTotal`, `remainingQuota`, `isOverBudget`, and tailored status badges.
2. **Requisition Approval UI Alignment (`src/components/RequisitionApproval.tsx`)**:
   - Eliminated `spk_borongan` query and labor contamination from warehouse material budget evaluations.
   - Enriched `rab_items` and `change_order_items` queries with `item_type`, `wbs_stage`, `cost_price`.
   - Wired `getRequisitionGate2Evaluation` to each requisition card and dialog handler.
   - Rendered emerald green status card: "Pagu Gate 2 (Aman — Sesuai Alokasi RAB [WBS])" with WBS quota breakdown.
   - Dynamic Approve button: Green (`bg-status-success`) with `<Check />` icon for valid requests, amber with `<AlertTriangle />` only when over-budget.
3. **Goods Issue Form Hygiene (`src/components/GoodsIssueForm.tsx`)**:
   - Filtered `rab_items` query strictly for `(item.item_type || 'MATERIAL').toUpperCase() === 'MATERIAL'`.
4. **Testing & Verification**:
   - `src/utils/__tests__/gate2BudgetValidation.test.ts` (9/9 tests passing).
   - `src/components/__tests__/RequisitionApprovalGate2.test.tsx` (2/2 tests passing).
   - Full Vitest suite: 26/26 test suites passing, 178/178 tests passing (100%).
   - Oxlint: 0 errors, 0 warnings across 146 files.
   - TypeScript: Clean static compilation (`npx tsc -b`).
   - Production Build: Clean Vite bundle generated in 1.98s (`npm run build`).

## Sprint 49 Objectives
1. Update `billingService.ts` to fetch approved change orders with complete itemized breakdown (`change_order_items`).
2. Implement printable invoice payload builder and print engine in `src/utils/invoiceExport.ts`.
3. Upgrade Customer Billing card in `KasirDashboard.tsx` with an interactive collapsible accordion displaying legal dispute protection details (WBS, approval date, item breakdown).
4. Map approved change order itemized breakdown into final invoice print payload and provide direct print actions.
5. Provide comprehensive unit and component tests ensuring zero regression.

## Quality & Verification Status
- **Vitest Unit & Component Testing:** 26/26 test suites passing, 178/178 tests passing (100%).
- **Linter (Oxlint):** 0 errors, 0 warnings across 146 files with 113 rules.
- **TypeScript Static Analysis:** Clean compilation with 0 errors (`npx tsc -b`).
- **Production Build:** Clean build in 1.98s (`npm run build`).

## Technical Debt Backlog
None.

## Next Up
- Task 1: Update data fetching & contracts in `billingService.ts`.

## Blockers
None.
