## Current Position
- **Sprint**: Sprint 29 — Enable Decimal Precision and Auto-Select on Focus for QTY and WBS Allocation Inputs
- **Status**: Sprint Completed ✅
- **Milestone**: Core Business Recommendations Hardening — Enterprise Production Readiness

## Last Session Summary
Sprint 29 Completed (2026-10-17).
- Created `src/utils/numberUtils.ts` with `parseDecimal(val)` helper supporting comma/dot decimal normalization and safe parsing.
- Refactored `RabCalculator.tsx` and `PackageAllocationModal.tsx`:
  - Configured `step="any"` and `min="0"` on QTY (Bahan) and WBS 1 to WBS 5 allocation inputs.
  - Attached `onFocus={(e) => e.target.select()}` and `onMouseUp={(e) => e.preventDefault()}` on all quantity, WBS allocation, and cost inputs for automatic text selection.
  - Updated allocation remaining calculation with float rounding tolerance (`Math.round((totalQty - sumWbsAllocated) * 100) / 100`).
  - Updated status indicator badge to display `Sesuai / Pas (0.00)` when balanced, `Sisa: X.XX` when remaining, or `Over: X.XX` when exceeded.
  - Ensured seamless decimal precision across both Material and Labor tabs.
  - Applied functional state updaters (`prev => ({ ...prev, ... })`) preventing stale closure overwrites when rapidly editing adjacent allocation cells.
- Added comprehensive unit tests in `src/components/__tests__/RabCalculatorDecimal.test.tsx` (7 tests) verifying decimal parsing, auto-select focus events, fractional allocation math (1.5 QTY -> 1 + 0.5), comma notation (1,5), and Labor multi-WBS allocations.
- Successfully verified 101/101 Vitest unit tests passing across 12 test files, 0 linter errors, and clean production build with Vite.

## Blockers
None.
