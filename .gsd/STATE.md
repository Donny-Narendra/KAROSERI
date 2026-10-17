## Current Position
- **Sprint**: Sprint 34 — Filter Material Requisition RAB Reference to Exclusively Show MATERIAL Items
- **Status**: Sprint completed ✅
- **Milestone**: Core Business Recommendations Hardening — Enterprise Production Readiness

## Last Session Summary
- Archived Sprint 33 to `.gsd/sprints/sprint-33-filter-spk-borongan-rab-reference-to-exclusively-show-labor-items.md`.
- Implemented strict `item_type = 'MATERIAL'` (with legacy null tolerance) query filter and in-memory predicate filtering in `MaterialRequisitionForm.tsx`, ensuring labor items (e.g., `materias tes tukang 1` / `LABOR`) and overhead entries (e.g., `Listrik` / `OVERHEAD`) never appear in the Mandor Material Requisition reference list.
- Verified header count badge, footer counter, and transfer mechanics (`<<` & double click).
- Created comprehensive unit tests in `src/components/__tests__/MaterialRequisitionForm.test.tsx` (all 120 tests passing across 15 test suites).
- Verified production build (`tsc -b && vite build`) and prepared commit `fix(mandor): filter requisition rab reference list to strictly require item_type = 'MATERIAL'`.

## Blockers
None.
