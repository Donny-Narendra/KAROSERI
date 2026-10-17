# Sprint 27 — Replace WBS Dropdown with Multi-Stage Allocation Grid in Labor RAB Calculator

> **Duration**: 2026-10-17 to 2026-10-17
> **Status**: Completed ✅

## Goal
Replace the single-select dropdown `TAHAPAN WBS` in the Labor/Jasa sub-form of `RabCalculator.tsx` with an interactive, multi-stage **ALOKASI WBS** grid (WBS 1 to WBS 5) matching the UX of the Material form, supporting both single and multi-WBS labor budget allocations with automatic total quantity calculation and robust validation.

## Scope

### Included
- **UI Refactoring in `RabCalculator.tsx`**:
  - Removed `<select id="labor-wbs-select">`.
  - Added interactive **ALOKASI WBS** grid with columns: `TOTAL QTY`, `WBS 1`, `WBS 2`, `WBS 3`, `WBS 4`, `WBS 5`.
  - Display computed `laborTotalQty` in high-visibility amber accent.
  - Symmetrical number inputs for each WBS stage with real-time total updates.
- **State Synchronization & Logic**:
  - `laborAllocations` state initialized to default (WBS 1: '1', others: '0').
  - Validation: at least 1 WBS must have quantity > 0 (`laborTotalQty > 0`); shows warning message and disables submit button when total is 0.
  - Iterative item creation: for each allocated WBS, creates a distinct `RabItem` with `item_type: 'LABOR'`, `wbsCategory: cat.id`, `qty: allocationQty`, and `subtotal: allocationQty * estimatedCost`.
  - Edit support: loading an existing labor item populates its corresponding WBS allocation.
- **Automated Testing & Quality**:
  - Updated tests in `RabCalculatorLabor.test.tsx` to verify grid display, single allocation, and multi-stage allocation (91/91 tests pass).
  - Clean TypeScript compilation, zero lint errors, and production build verified.

### Explicitly Excluded
- Changing existing database schema or views (already compatible with multiple labor rows per SPK).

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Refactor state and handlers in `RabCalculator.tsx` for `laborAllocations` | Antigravity | ✅ Done | 0.2h |
| 2. Replace dropdown with ALOKASI WBS grid in Labor form JSX | Antigravity | ✅ Done | 0.2h |
| 3. Update tests in `RabCalculatorLabor.test.tsx` for multi-stage allocation | Antigravity | ✅ Done | 0.2h |
| 4. Validate with `npm test`, `npm run lint`, and `npm run build` | Antigravity | ✅ Done | 0.2h |

## Daily Log

### 2026-10-17
- Initialized Sprint 27: Replace WBS Dropdown with Multi-Stage Allocation Grid in Labor RAB Calculator.
- Refactored `RabCalculator.tsx`:
  - Added `laborAllocations` state (`Record<string, string>`) and computed `laborTotalQty`.
  - Replaced `<select id="labor-wbs-select">` with interactive 6-column **ALOKASI WBS** table grid.
  - Updated `handleAddLaborItem` to iterate over all WBS stages with quantity > 0 and create distinct `RabItem` entries with proper subtotals.
  - Updated `handleEditItem`, `handleCancelEdit`, and mode toggles to sync `laborAllocations`.
  - Added validation warning and disabled state when `laborTotalQty <= 0`.
- Updated test suites in `RabCalculatorLabor.test.tsx`:
  - Verified dropdown removal and presence of ALOKASI WBS grid.
  - Verified single-WBS and multi-WBS labor allocation.
- Ran quality checks:
  - Vitest: 91/91 tests passing (11 test files).
  - Linter: 0 errors.
  - Build: Successful production bundle.

## Retrospective (2026-10-17)

### What Went Well
- Unified UX between Material and Labor input forms: both now utilize the interactive multi-WBS allocation matrix.
- Service Advisors can now allocate labor jobs across multiple WBS stages simultaneously in a single submission without re-entering the form multiple times.
- 100% test pass rate with 0 linter errors and verified build.

### What Could Improve
- None noted; implementation directly aligns with business requirements.

### Action Items
- [x] Create atomic commit: `refactor(rab): replace labor wbs dropdown with interactive allocation grid`.
