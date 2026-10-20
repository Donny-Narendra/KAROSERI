## Current Position
- **Sprint**: Sprint 51 — Ingest Approved Change Order Labor and Overhead Items into Mandor Workflows
- **Status**: Sprint in progress 🟡
- **Milestone**: Core Business Recommendations Hardening — Enterprise Production Readiness

## Last Session Summary
Completed Sprint 50: Fixed foreign key constraint violation (`material_requisition_items_rab_item_id_fkey`) for Change Order materials, verified with 29 Vitest test suites (191 tests passing), 0 linter warnings, clean TypeScript, and production build. Archived Sprint 50 to `.gsd/sprints/sprint-50-fix-material-requisition-items-foreign-key-constraint-for-change-order-items.md`.

## Active Sprint Plan (Sprint 51)
Ingesting approved Change Order items with `item_type = 'LABOR'` into `SpkBoronganPanel.tsx` and `item_type = 'OVERHEAD'` into `SpkOverheadModal.tsx`, persisting `change_order_item_id` into execution logs, and updating PostgreSQL view `view_wbs_cost_variance` so Change Order labor and overhead budgets are integrated into financial reports.

### Tasks
1. Database migration: `spk_borongan.change_order_item_id`, `spk_overhead_logs.change_order_item_id`, and updated `view_wbs_cost_variance` view.
2. Merge approved Change Order LABOR items into `SpkBoronganPanel.tsx`.
3. Merge approved Change Order OVERHEAD items into `SpkOverheadModal.tsx` and update financial types/services.
4. Update unit tests in `SpkBoronganPanel.test.tsx` and `SpkOverheadModal.test.tsx`.
5. Run full test suite, oxlint, typecheck, and build validation.

## Quality & Verification Status
- **Vitest Unit & Component Testing:** 29/29 test suites passing, 191/191 tests passing (100%).
- **Linter (Oxlint):** 0 errors, 0 warnings across 149 files with 113 rules.
- **TypeScript Static Analysis:** Clean compilation with 0 errors (`npx tsc -b`).
- **Production Build:** Clean build in 511ms (`npm run build`).

## Technical Debt Backlog
None.

## Next Up
- Execute Task 1: Create SQL database migration.
