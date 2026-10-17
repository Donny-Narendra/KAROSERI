## Current Position
- **Sprint**: Sprint 32 — Fix decimal allocation sum and status calculation for Overhead in RAB Calculator
- **Status**: Sprint completed ✅
- **Milestone**: Core Business Recommendations Hardening — Enterprise Production Readiness

## Last Session Summary
- Archived Sprint 31 to `.gsd/sprints/sprint-31-update-overhead-label-terminology-in-rab-calculator.md`.
- Implemented and exported `parseDecimalValue` supporting Indonesian comma notation (`0,5`), period notation (`0.5`), numbers, null, and undefined in `numberUtils.ts` and `RabCalculator.tsx`.
- Updated `RabCalculator.tsx` WBS allocation calculations and inputs with `inputMode="decimal"` and comma normalization, ensuring STATUS badge reactively reflects `overheadAllocatedSum`, `overheadRemaining`, and `isAllocationPassed`.
- Expanded unit tests in `src/components/__tests__/RabCalculatorOverhead.test.tsx` (all 110 tests pass across 13 test suites).
- Verified production build (`tsc -b && vite build`) and linter (`oxlint`).

## Blockers
None.
