# Sprint 48 — Refactor Gate 2 Warehouse Approval Budget Guard to Material-Only and WBS-Specific Scope

> **Duration**: 2026-10-19 to 2026-10-20
> **Status**: Completed ✅

## Goal
Refactor Gate 2 Warehouse Approval budget limit validation in Petugas Gudang portal (`RequisitionApproval.tsx`) so that budget and expenditure calculations are strictly restricted to physical materials (`item_type = 'MATERIAL'`), completely eliminating labor (`spk_borongan`) and overhead contaminations, and evaluating budget quotas on a WBS-specific scope so valid requisitions (such as SPK-2668 WBS 1: Pembongkaran) display green valid status ("Sesuai Alokasi RAB WBS") without false-positive over-budget warnings.

## Scope

### Included
- **Gate 2 Calculation Engine (`src/utils/gate2BudgetValidation.ts`)**:
  - Pure, testable functions for:
    - `normalizeWbsStage(stage?: string | null): string`: Standardize WBS stage names across formats (e.g. `'WBS 1: Pembongkaran'` vs `'Pembongkaran'`).
    - `getWbsMaterialBudget(...)`: Sum pure material items (`item_type === 'MATERIAL' || !item_type`) for a given SPK and WBS stage from `rab_items` and approved `change_order_items`.
    - `getWbsMaterialCommitted(...)`: Sum approved material requisitions and direct material issues for a given SPK and WBS stage.
    - `evaluateGate2Budget(...)`: Return comprehensive evaluation results including WBS-specific breakdown, remaining quota, over-budget flag, and formatted alerts.
- **Warehouse Requisition Approval UI Refactoring (`src/components/RequisitionApproval.tsx`)**:
  - Updated data fetching queries to select `item_type`, `wbs_stage`, `unit_price`, `cost_price` from `rab_items` and `change_order_items`.
  - Removed labor (`spk_borongan`) and overhead from material commitment calculations.
  - Computed WBS-specific budget allocations for each requisition card based on its WBS category / stage.
  - Rendered WBS-specific Gate 2 status cards:
    - Valid state (Emerald green): "Pagu Gate 2 (Aman — Sesuai Alokasi RAB WBS)".
    - Over-budget state (Rose/Amber): "PERINGATAN PAGU GATE 2 (OVER BUDGET)".
  - Dynamic Approve button:
    - Green (`bg-status-success`) with `<Check />` when within WBS budget.
    - Amber (`bg-amber-600`) with `<AlertTriangle />` when over budget.
  - Updated confirmation dialog messages to reflect WBS stage context.
- **Goods Issue Form Hygiene (`src/components/GoodsIssueForm.tsx`)**:
  - Filtered `rab_items` query for `item_type === 'MATERIAL' || !item_type` to avoid non-material items entering direct issue form.
- **Unit & Integration Testing**:
  - Created comprehensive unit tests for `gate2BudgetValidation.ts` (9 tests passing).
  - Created component tests for `RequisitionApprovalGate2.test.tsx` (2 tests passing).
  - Verified SPK-2668 WBS 1 requisition (`material tes 2`, Rp 55.000) evaluates to valid green status without over-budget warning.
  - Ran full test suite: 26/26 test suites passing, 178/178 tests passing (100%).
  - Linter: 0 warnings, 0 errors across 146 files (Oxlint).
  - TypeScript: Clean compilation (`npx tsc -b`).
  - Production build: Clean build in 1.98s (`npm run build`).

### Explicitly Excluded
- Altering financial database views (`spk_job_order_cost_summary` or `spk_wbs_cost_variance`).
- Modifying Mandor portal submission workflow or SPK Borongan assignment workflows.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Create modular Gate 2 budget validation engine (`gate2BudgetValidation.ts`) | Antigravity | ✅ Done | 0.3h |
| 2. Refactor `RequisitionApproval.tsx` to evaluate WBS-specific material budgets and remove labor | Antigravity | ✅ Done | 0.4h |
| 3. Update `GoodsIssueForm.tsx` to strictly filter material items in RAB query | Antigravity | ✅ Done | 0.1h |
| 4. Write unit tests for Gate 2 logic & verify SPK-2668 end-to-end | Antigravity | ✅ Done | 0.3h |

## Daily Log

### 2026-10-19 / 2026-10-20
- Initialized Sprint 48: Refactor Gate 2 Warehouse Approval Budget Guard to Material-Only and WBS-Specific Scope.
- Archived Sprint 47 to `.gsd/sprints/sprint-47-dynamic-rab-driven-presets-for-floor-overhead-terminal-in-mandor-portal.md`.
- Executed full test suite baseline: 24/24 suites passed, 167/167 tests passed.
- Analyzed root causes of false-positive Gate 2 warning on SPK-2668:
  1. `spk_borongan.contract_value` (Rp 1.900.000 labor jasa) was incorrectly summed into `boronganMaterialCost` and added to material expenditures.
  2. `rab_items` query omitted `item_type` and `wbs_stage`, mixing all items together.
  3. Budget evaluation was calculated globally across the entire SPK instead of per WBS stage.
- Implemented `src/utils/gate2BudgetValidation.ts` providing pure, testable functions (`normalizeWbsStage`, `getWbsMaterialBudget`, `getWbsMaterialCommitted`, `evaluateGate2Budget`).
- Refactored `src/components/RequisitionApproval.tsx`:
  - Removed `spk_borongan` query and labor cost additions.
  - Added `item_type`, `wbs_stage`, `cost_price` to `rab_items` and `change_order_items` queries.
  - Linked each pending card to WBS-specific Gate 2 budget evaluation via `getRequisitionGate2Evaluation`.
  - Updated card alert banner to emerald green "Pagu Gate 2 (Aman — Sesuai Alokasi RAB [WBS])" with detailed breakdown.
  - Configured Approve button to dynamic green valid status with Check icon when within budget, and amber when over-budget.
  - Updated confirmation modal to include WBS stage context.
- Updated `src/components/GoodsIssueForm.tsx` to filter `rab_items` strictly for `(item.item_type || 'MATERIAL').toUpperCase() === 'MATERIAL'`.
- Created unit test suite `src/utils/__tests__/gate2BudgetValidation.test.ts` (9 tests passing).
- Created component test suite `src/components/__tests__/RequisitionApprovalGate2.test.tsx` (2 tests passing).
- Full regression verification: 26/26 test suites passed (178/178 tests passed, 100%).
- Oxlint: 0 errors, 0 warnings across 146 files.
- TypeScript compilation and Vite production build passed cleanly.
