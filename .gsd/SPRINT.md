# Sprint 32 — Fix decimal allocation sum and status calculation for Overhead in RAB Calculator

> **Duration**: 2026-10-17 to 2026-10-17
> **Status**: Completed ✅

## Goal
Fix decimal allocation parsing and reactive status calculation in the Overhead sub-section of RabCalculator (`/service-advisor`), ensuring inputs with comma (`0,5`) or period (`0.5`) in WBS 1 to WBS 5 correctly update `overheadAllocatedSum`, compute `remaining`, and reactively display the accurate STATUS badge without getting stuck at `Sisa: 1.00`.

## Scope

### Included
- **Decimal Normalization Helper**:
  - Implement and export `parseDecimalValue` in `src/utils/numberUtils.ts` and `src/components/RabCalculator.tsx`.
  - Safely normalize comma `,` to period `.` and handle numbers, strings, null, and undefined values.
- **Overhead WBS Allocation & Status Calculation**:
  - Compute `overheadAllocatedSum`, `overheadRemaining`, and `isOverheadAllocationPassed` in `RabCalculator.tsx`.
  - Normalize WBS input changes from comma `,` to period `.` so browser numeric/decimal inputs never drop decimal values or produce `NaN`.
  - Ensure the STATUS column badge reactively displays `Sesuai / Pas (0.00)`, `Sisa: X.XX`, or `Lebih: X.XX`.
  - Ensure "+ Tambah Overhead ke RAB" submit button enables reactively when `isAllocationPassed` is satisfied.
- **Unit Testing & Verification**:
  - Add unit tests verifying decimal WBS allocation (`0,5` and `0.5`) in Overhead mode, verifying reactive badge transitions and sum calculations.
  - Run full test suite (`npm test`), linter (`npm run lint`), and production build (`npm run build`).

### Explicitly Excluded
- Database schema changes.
- Altering core financial reporting views or service functions.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Implement `parseDecimalValue` helper in `numberUtils.ts` and export in `RabCalculator.tsx` | Antigravity | ✅ Done | 0.2h |
| 2. Refactor decimal normalization and reactive allocation calculation for Overhead in `RabCalculator.tsx` | Antigravity | ✅ Done | 0.3h |
| 3. Add automated unit tests for Overhead decimal WBS allocation in `RabCalculatorOverhead.test.tsx` | Antigravity | ✅ Done | 0.2h |
| 4. Validation (Vitest, Oxlint, Vite build) | Antigravity | ✅ Done | 0.2h |

## Daily Log

### 2026-10-17
- Archived Sprint 31 to `.gsd/sprints/sprint-31-update-overhead-label-terminology-in-rab-calculator.md`.
- Initialized Sprint 32: Fix decimal allocation sum and status calculation for Overhead in RAB Calculator.
- Implemented `parseDecimalValue` in `src/utils/numberUtils.ts` supporting commas, periods, numbers, null/undefined, and exported in `src/components/RabCalculator.tsx`.
- Updated reactive allocation state calculations in `RabCalculator.tsx` using `parseDecimalValue` and normalized inputs (`replace(',', '.')`).
- Updated STATUS badge to display `Sesuai / Pas (0.00)`, `Sisa: X.XX`, and `Lebih: X.XX`.
- Added unit tests in `src/components/__tests__/RabCalculatorOverhead.test.tsx` testing helper and reactive badge status changes with comma input.
- Verified test suite (13/13 test files passed, 110/110 tests passed), linter (0 errors), and build (`tsc -b && vite build` succeeded).
