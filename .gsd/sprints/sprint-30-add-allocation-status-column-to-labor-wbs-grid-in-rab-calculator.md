# Sprint 30 — Add Allocation Status Column to Labor WBS Grid in RAB Calculator

> **Duration**: 2026-10-17 to 2026-10-17
> **Status**: Completed ✅

## Goal
Add a dedicated STATUS column to the Labor / Tukang ALOKASI WBS table grid in RabCalculator (`/service-advisor`), compute allocation balance dynamically (`allocatedSum`, `remaining`), show dynamic status badges (`Sesuai / Pas (0.00)`, `Sisa: X.XX`, `Lebih: X.XX`), and enforce allocation completeness validation before adding/updating labor items.

## Scope

### Included
- **7-Column Grid Layout for Labor WBS**:
  - Updated grid container header from 6 columns to 7 columns: `TOTAL QTY`, `WBS 1`, `WBS 2`, `WBS 3`, `WBS 4`, `WBS 5`, and `STATUS`.
  - Updated row layout to 7 columns:
    - Column 1: `TOTAL QTY` (displays `laborTargetQty`).
    - Columns 2–6: WBS 1 to WBS 5 allocation inputs with `step="any"` and `onFocus` auto-select.
    - Column 7: Dynamic STATUS badge:
      - `Sesuai / Pas (0.00)` (`bg-emerald-950/80 text-emerald-400 border border-emerald-800`) when `remaining === 0`.
      - `Sisa: X.XX` (`bg-rose-950/80 text-rose-400 border border-rose-800`) when `remaining > 0`.
      - `Lebih: X.XX` (`bg-amber-950/80 text-amber-400 border border-amber-800`) when `remaining < 0`.
- **Target Quantity & Balance Calculation**:
  - Introduced `laborTargetQty` (default 1) with editable Target Qty field in labor form.
  - Computed `laborAllocatedSum = round((wbs1 + wbs2 + wbs3 + wbs4 + wbs5) * 100) / 100`.
  - Computed `laborRemaining = round((laborTargetQty - laborAllocatedSum) * 100) / 100`.
  - Determined `isLaborAllocationMatch = Math.abs(laborRemaining) < 0.001 && laborAllocatedSum > 0`.
- **Form Guard & Feedback**:
  - Guarded "+ Tambah Jasa ke RAB" button with `disabled={!isLaborAllocationMatch || ...}`.
  - Provided modal feedback explaining the remaining/excess allocation if submit attempted while unbalanced.
  - Synchronized `laborTargetQty` across edit item, cancel edit, and mode toggle resets.
- **Automated Testing & Quality**:
  - Unit tests verifying 7-column header/row structure, dynamic badge transitions (Sisa -> Sesuai / Pas -> Lebih), and button guard behavior.
  - 103 Vitest unit tests passing across 12 test files, 0 linter errors, and clean production build.

### Explicitly Excluded
- Database schema changes.
- Modifying Material or Overhead tab layouts.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Update Labor WBS grid header and row to 7 columns with STATUS column | Antigravity | ✅ Done | 0.3h |
| 2. Implement `laborTargetQty`, `laborAllocatedSum`, `laborRemaining`, and badge rendering | Antigravity | ✅ Done | 0.3h |
| 3. Enforce button disabled guard and modal feedback for incomplete/over allocation | Antigravity | ✅ Done | 0.2h |
| 4. Update and expand unit tests in `RabCalculatorLabor.test.tsx` and `RabCalculatorDecimal.test.tsx` | Antigravity | ✅ Done | 0.3h |
| 5. Validation with Vitest, linter, and production build | Antigravity | ✅ Done | 0.2h |

## Daily Log

### 2026-10-17
- Initialized Sprint 30: Add Allocation Status Column to Labor WBS Grid in RAB Calculator.
- Refactored `RabCalculator.tsx` to add `laborTargetQty` state (default 1) and editable `Target Qty (Lot / Unit)` field.
- Implemented `laborAllocatedSum`, `laborRemaining`, and `isLaborAllocationMatch` with 2-decimal rounding tolerance.
- Expanded Labor ALOKASI WBS grid to 7 columns with `STATUS` column in both header and row.
- Rendered dynamic status badges with exact styling:
  - Exact match: `Sesuai / Pas (0.00)` (`bg-emerald-950/80 text-emerald-400 border border-emerald-800`).
  - Under-allocated: `Sisa: X.XX` (`bg-rose-950/80 text-rose-400 border border-rose-800`).
  - Over-allocated: `Lebih: X.XX` (`bg-amber-950/80 text-amber-400 border border-amber-800`).
- Updated submit button to disable until `isLaborAllocationMatch === true` and provide descriptive warning message below grid.
- Synchronized `laborTargetQty` on `handleEditItem`, `handleCancelEdit`, and `toggle-mode-labor`.
- Added unit tests in `RabCalculatorLabor.test.tsx` verifying STATUS header, dynamic badge transitions, and submit button guard.
- Updated `RabCalculatorDecimal.test.tsx` to align with the Target Qty workflow.
- Verified 103/103 Vitest tests pass across all 12 test files, 0 linter errors, and successful production build with Vite.
