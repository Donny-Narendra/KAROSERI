## Current Position
- **Sprint**: Sprint 39 — Change Order 3-Element Costing (Overhead Support in Amendments)
- **Status**: Completed ✅
- **Milestone**: Core Business Recommendations Hardening — Enterprise Production Readiness

## Last Session Summary
- Archived Sprint 38 to `.gsd/sprints/sprint-38-fix-rab-overhead-constraint-and-enable-overhead-budget-in-3-element-costing.md`.
- Completed Sprint 39 (Change Order 3-Element Costing — Overhead Support in Amendments):
  - Updated `ChangeOrderItemType` in `src/types/database.ts` to `'MATERIAL' | 'LABOR' | 'OVERHEAD'`.
  - Updated `spkService.createChangeOrder` items contract to use `ChangeOrderItemType`.
  - Added `+ Item Overhead (FOH)` button in `AmendmentManager.tsx` with purple accent and `Clock` icon.
  - Implemented form handling for `OVERHEAD` items (default unit `'hari'`, clear `material_id`).
  - Added custom label `Uraian Biaya Overhead (FOH) *` and placeholder in draft item cards.
  - Updated draft summary calculation to count `overheadCount` alongside material and labor.
  - Styled purple badges for `OVERHEAD` across draft line item cards and the expandable detail table.
  - Created unit test suite `src/components/__tests__/AmendmentManager.test.tsx` (3 tests passing).
  - Verified all 17 Vitest test suites (133 tests passing 100%), clean `tsc -b`, and production build passing in 516ms.

## Next Up
- **Sprint 40**: Mandor Floor Terminal Overhead Logging Module (Real-Time FOH Actuals in `spk_overhead_logs`).

## Blockers
None.
