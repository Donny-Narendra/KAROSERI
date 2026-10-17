## Current Position
- **Sprint**: Sprint 38 — Fix RAB Overhead Constraint and Enable Overhead Budget in 3-Element Costing
- **Status**: Completed ✅
- **Milestone**: Core Business Recommendations Hardening — Enterprise Production Readiness

## Last Session Summary
- Archived Sprint 37 to `.gsd/sprints/sprint-37-audit-and-verification-of-overhead-tracking-and-3-element-costing-implementation.md`.
- Completed Sprint 38 (Fix RAB Overhead Constraint and Enable Overhead Budget in 3-Element Costing):
  - Created & applied migration `20261018000000_enable_overhead_item_type_in_rab_items.sql` expanding `rab_items_item_type_check` to `CHECK (item_type IN ('MATERIAL', 'LABOR', 'OVERHEAD'))`.
  - Backfilled historical overhead items ('Listrik') with `item_type = 'OVERHEAD'` and accurate `unit_price = 1600000.00`.
  - Verified `view_wbs_cost_variance` now aggregates `total_overhead_budget` (Rp 800.000 per stage) live in PostgreSQL.
  - Updated `RabItemRecord.item_type` in `src/types/database.ts` to include `'OVERHEAD'`.
  - Updated `RabCalculator.tsx` to save and load overhead items with `item_type: 'OVERHEAD'`, non-zero `unit_price`, and `material_id: null`.
  - Added new unit test in `RabCalculatorOverhead.test.tsx` verifying payload persistence.
  - Verified all 16 Vitest test suites (130 tests passing 100%), clean `tsc -b`, and production build passing.

## Next Up
- **Sprint 39**: Change Order 3-Element Costing — Overhead (FOH) Support in `AmendmentManager.tsx` and `change_order_items`.

## Blockers
None.
