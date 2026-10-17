# Sprint 29 — Enable Decimal Precision and Auto-Select on Focus for QTY and WBS Allocation Inputs

> **Duration**: 2026-10-17 to 2026-10-17
> **Status**: Completed ✅

## Goal
Enable decimal precision (supporting both '.' and ',' decimal separators) and auto-select on focus (`onFocus={(e) => e.target.select()}`, `onMouseUp={(e) => e.preventDefault()}`) for QTY and WBS 1-5 allocation inputs in RabCalculator (both Material and Labor forms), with rounded remainder tolerance.

## Scope

### Included
- **Decimal Precision & Input Attributes**:
  - Configure `step="any"` and `min="0"` on QTY and WBS 1 to WBS 5 allocation inputs in `RabCalculator.tsx` and `PackageAllocationModal.tsx`.
  - Provide `parseDecimal(val)` helper in `src/utils/numberUtils.ts` normalizing comma `,` to dot `.` and safely parsing floats without forced `parseInt()`.
  - Ensure users can input fractional material quantities (e.g., 1.5 plat bordes, 0.5 kg kawat las, 2.5 liter cat) and split across WBS stages.
- **Auto-Select on Focus**:
  - Attached `onFocus={(e) => e.target.select()}` and `onMouseUp={(e) => e.preventDefault()}` on QTY and WBS 1 to WBS 5 inputs across both Material and Labor tabs.
- **Allocation Remainder & Status Badge**:
  - Recalculated remaining allocation using JavaScript floating-point rounding tolerance: `Math.round((totalQty - sumWbsAllocated) * 100) / 100`.
  - Updated status badge to display exact Indonesian status: `Sesuai / Pas (0.00)` when balanced, `Sisa: X.XX` when remaining, or `Over: X.XX` when over quota.
- **Labor Form Parity**:
  - Applied the same decimal precision and auto-select behaviors to the Labor / Tukang tab allocation grid.
- **Automated Testing & Verification**:
  - Added unit test suite `src/components/__tests__/RabCalculatorDecimal.test.tsx` verifying decimal inputs, fractional WBS splitting, comma/dot format, and auto-select attributes.
  - Ran `npm test`, `npm run lint`, and `npm run build`.

### Explicitly Excluded
- Database schema changes.
- Altering unrelated financial reporting services.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Refactor QTY and WBS 1-5 inputs in `RabCalculator.tsx` with `step="any"`, `min="0"`, `parseDecimal`, and `onFocus` auto-select | Antigravity | ✅ Done | 0.4h |
| 2. Update remaining calculation and status badge with floating-point tolerance | Antigravity | ✅ Done | 0.2h |
| 3. Add automated tests for decimal input handling and auto-select | Antigravity | ✅ Done | 0.3h |
| 4. Verification with Vitest, linter, and production build | Antigravity | ✅ Done | 0.2h |

## Daily Log

### 2026-10-17
- Initialized Sprint 29: Enable Decimal Precision and Auto-Select on Focus for QTY and WBS Allocation Inputs.
- Created `src/utils/numberUtils.ts` exporting `parseDecimal(val)` helper to safely normalize comma/dot decimals and handle string/number/null types.
- Updated `RabCalculator.tsx` QTY and WBS 1 to WBS 5 allocation inputs with `step="any"`, `min="0"`, `onFocus={(e) => e.target.select()}`, and `onMouseUp={(e) => e.preventDefault()}`.
- Refactored allocation remaining calculation and badge display in `RabCalculator.tsx` to handle 2-decimal float tolerance and display `Sesuai / Pas (0.00)` / `Sisa: X.XX` / `Over: X.XX`.
- Applied functional state updaters (`prev => ({ ...prev, ... })`) for `newItem`, `manualAllocations`, and `laborAllocations` to eliminate stale closure bugs during multi-cell edits.
- Enhanced `PackageAllocationModal.tsx` WBS inputs with `step="any"`, `parseDecimal`, and auto-select on focus.
- Implemented comprehensive test suite in `src/components/__tests__/RabCalculatorDecimal.test.tsx` covering `parseDecimal`, auto-select focus events, fractional allocation math (1.5 QTY -> 1 + 0.5), comma notation (1,5), and Labor multi-WBS allocations.
- Validated all 101 Vitest unit tests pass across 12 test files, 0 linter errors, and verified production build with Vite.
