# Sprint 26 — Hide Waste Factor Input and Default to 0 in RAB Calculator

> **Duration**: 2026-10-17 to 2026-10-17
> **Status**: Completed ✅

## Goal
Hide the Waste Factor (%) input field in the Service Advisor RAB Calculator (`RabCalculator.tsx`) and change its default value from 5% to 0% so material cost estimations remain pure (Qty × Unit Price) without unintended scrap markup while maintaining backward-compatible calculation logic.

## Scope

### Included
- **State Initialization & Reset**:
  - Update `wasteFactor` default state in `RabCalculator.tsx` from `5` to `0`.
  - Ensure resets on form submit, edit cancel, and tab toggle reset `wasteFactor` to `0`.
- **UI Element Hidden**:
  - Hide the `Waste Factor (%)` input element in `RabCalculator.tsx` without disrupting the symmetrical 2-column grid layout for `Qty (Bahan)` and `Harga Satuan Bahan`.
- **Calculation Verification**:
  - Confirm calculation formula `quantity * unitPrice * (1 + wasteFactor / 100)` produces clean `quantity * unitPrice` when `wasteFactor = 0`.
- **Testing & Quality**:
  - Add automated test verifying waste factor field is hidden and Qty 1 × Rp 1,600,000 results in exactly Rp 1,600,000.
  - Run `npm test`, `npm run lint`, and `npm run build`.

### Explicitly Excluded
- Removing `wasteFactor` column or property from `RabItem` interface or database schema (preserving data compatibility).
- Altering Goods Issue warehouse waste factor logic.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Update wasteFactor state initialization and resets to default 0 in `RabCalculator.tsx` | Antigravity | ✅ Done | 0.2h |
| 2. Hide Waste Factor (%) input in JSX with clean 2-column grid alignment | Antigravity | ✅ Done | 0.2h |
| 3. Add test cases in `RabCalculatorLabor.test.tsx` and `rabLaborBudget.test.ts` | Antigravity | ✅ Done | 0.2h |
| 4. Validate with `npm test`, `npm run lint`, and `npm run build` | Antigravity | ✅ Done | 0.2h |

## Daily Log

### 2026-10-17
- Initialized Sprint 26: Hide Waste Factor Input and Default to 0 in RAB Calculator.
- Refactored `RabCalculator.tsx`:
  - Changed initial `newItem.wasteFactor` from 5 to 0.
  - Reset `wasteFactor` to 0 in `handleAddItem` and `handleCancelEdit`.
  - Reset `wasteFactor` to 0 on clicking toggle tab "Bahan Baku (Material)".
  - Replaced visible Waste Factor (%) input block with hidden input `<input type="hidden" id="waste-factor-input" value={newItem.wasteFactor ?? 0} />`, preserving symmetrical 2-column grid for `Qty (Bahan)` and `Harga Satuan Bahan`.
- Updated test suites:
  - Added test in `RabCalculatorLabor.test.tsx` verifying Waste Factor label is not rendered and hidden input has value 0.
  - Added test in `rabLaborBudget.test.ts` verifying Qty 1 × Rp 1.600.000 results in exact Rp 1.600.000 (no +5% or +Rp 80.000 markup).
- Ran verification checks:
  - `npm test`: 90/90 tests passed across 11 test suites.
  - `npm run lint`: 0 errors.
  - `npm run build`: successful production build.

## Retrospective (2026-10-17)

### What Went Well
- Pure material estimation calculation achieved without unintended 5% scrap distortion.
- Symmetrical 2-column layout for Qty and Harga Satuan looks clean and balanced without leftover empty spaces.
- Backward compatibility preserved for existing database records or historical calculations.
- 100% test pass rate (90/90 tests passing) and 0 linter errors.

### What Could Improve
- None noted; straightforward refactoring with full test coverage.

### Action Items
- [x] Create atomic git commit `refactor(rab): hide waste factor input and default value to 0`.
