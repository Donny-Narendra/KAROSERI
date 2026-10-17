# Sprint 29 — Enable Decimal Precision and Auto-Select on Focus for QTY and WBS Allocation Inputs

> **Duration**: 2026-10-17 to 2026-10-17
> **Status**: In Progress

## Goal
Enable decimal precision (supporting both '.' and ',' decimal separators) and auto-select on focus (`onFocus={(e) => e.target.select()}`, `onMouseUp={(e) => e.preventDefault()}`) for QTY and WBS 1-5 allocation inputs in RabCalculator (both Material and Labor forms), with rounded remainder tolerance.

## Scope

### Included
- **Decimal Precision & Input Attributes**:
  - Configure `step="any"` and `min="0"` on QTY and WBS 1 to WBS 5 allocation inputs in `RabCalculator.tsx`.
  - Provide `parseDecimal(val)` helper that normalizes comma `,` to dot `.` and safely parses floats without forced `parseInt()`.
  - Ensure users can input fractional material quantities (e.g., 1.5 plat bordes, 0.5 kg kawat las, 2.5 liter cat) and split across WBS stages.
- **Auto-Select on Focus**:
  - Attach `onFocus={(e) => e.target.select()}` and `onMouseUp={(e) => e.preventDefault()}` on QTY and WBS 1 to WBS 5 inputs across both Material and Labor tabs.
- **Allocation Remainder & Status Badge**:
  - Recalculate remaining allocation using JavaScript floating-point rounding tolerance: `Math.round((totalQty - sumWbsAllocated) * 100) / 100`.
  - Ensure status badge displays exact status (e.g. `PASSED` / `Sesuai / Pas (0.00)` when balanced, or clean decimal remainder `Sisa: 0.50`).
- **Labor Form Parity**:
  - Apply the same decimal and auto-select behaviors to the Labor / Tukang tab allocation grid.
- **Automated Testing & Verification**:
  - Add test cases in `RabCalculatorLabor.test.tsx` verifying decimal inputs, fractional WBS splitting, and auto-select attributes.
  - Run `npm test`, `npm run lint`, and `npm run build`.

### Explicitly Excluded
- Database schema changes.
- Altering unrelated financial reporting services.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Refactor QTY and WBS 1-5 inputs in `RabCalculator.tsx` with `step="any"`, `min="0"`, `parseDecimal`, and `onFocus` auto-select | Antigravity | 🔄 In Progress | 0.4h |
| 2. Update remaining calculation and status badge with floating-point tolerance | Antigravity | ⬜ Todo | 0.2h |
| 3. Add automated tests for decimal input handling and auto-select | Antigravity | ⬜ Todo | 0.3h |
| 4. Verification with Vitest, linter, and production build | Antigravity | ⬜ Todo | 0.2h |

## Daily Log

### 2026-10-17
- Initialized Sprint 29: Enable Decimal Precision and Auto-Select on Focus for QTY and WBS Allocation Inputs.
