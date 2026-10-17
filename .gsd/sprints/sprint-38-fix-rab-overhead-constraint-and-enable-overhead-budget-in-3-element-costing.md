# Sprint 38 — Fix RAB Overhead Constraint and Enable Overhead Budget in 3-Element Costing

> **Duration**: 2026-10-18 to 2026-10-18
> **Status**: Completed ✅

## Goal
Ensure overhead items in RAB are saved to `rab_items` with `item_type = 'OVERHEAD'` and proper `unit_price`, expand PostgreSQL check constraint `rab_items_item_type_check` to allow `'OVERHEAD'`, backfill historical overhead records, and ensure `view_wbs_cost_variance.rab_overhead_budget` aggregates accurately across the 3-element costing pipeline.

## Scope

### Included
- **Database Schema & Migrations (`supabase/migrations/`)**:
  - Migration `20261018000000_enable_overhead_item_type_in_rab_items.sql`.
  - Drop and recreate `rab_items_item_type_check` to `CHECK (item_type IN ('MATERIAL', 'LABOR', 'OVERHEAD'))`.
  - Backfill existing overhead items (e.g. 'Listrik') in `rab_items` to set `item_type = 'OVERHEAD'` and restore `unit_price`.
  - Update `view_wbs_cost_variance` with resilient `COALESCE(item_total, quantity * unit_price)` overhead budget aggregation.
- **TypeScript Types (`src/types/database.ts`)**:
  - Update `RabItemRecord.item_type` to `'MATERIAL' | 'LABOR' | 'OVERHEAD'`.
- **UI & Service Logic (`src/components/RabCalculator.tsx`)**:
  - Update `handleSaveEstimation` to set `item_type = 'OVERHEAD'` and preserve `unitPrice` for overhead items.
  - Update `fetchExistingRab` to recognize `dbItem.item_type === 'OVERHEAD'`.
  - Ensure `overhead_hours`, `overhead_rate`, and `unit_price` are synchronized.
- **Testing & Verification**:
  - Added assertion in `RabCalculatorOverhead.test.tsx` verifying `rab_items.insert` payload includes `item_type: 'OVERHEAD'`, `unit_price: 1600000`, `quantity: 0.5`, `item_total: 800000`, and `material_id: null`.
  - Ran empirical database validation script against Supabase PostgreSQL verifying constraint and view calculation.
  - Verified all 16 Vitest test suites (130 tests passing 100%), clean `tsc -b`, and production build (`npm run build`).

### Explicitly Excluded
- Change Order / Amendment Manager overhead support (scheduled for Sprint 39).
- Mandor operational actual overhead logging UI (scheduled for Sprint 40).

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Create SQL Migration `20261018000000_enable_overhead_item_type_in_rab_items.sql` | Antigravity | ✅ Done | 0.2h |
| 2. Apply migration to Supabase PostgreSQL and verify constraints | Antigravity | ✅ Done | 0.2h |
| 3. Update TypeScript contract in `src/types/database.ts` | Antigravity | ✅ Done | 0.1h |
| 4. Update saving and loading logic in `src/components/RabCalculator.tsx` | Antigravity | ✅ Done | 0.3h |
| 5. Update unit test `RabCalculatorOverhead.test.tsx` and run full verification | Antigravity | ✅ Done | 0.2h |

## Daily Log

### 2026-10-18
- Initialized Sprint 38: Fix RAB Overhead Constraint and Enable Overhead Budget in 3-Element Costing.
- Confirmed PostgreSQL constraint `rab_items_item_type_check` currently restricts `item_type` to `('MATERIAL', 'LABOR')`.
- Identified 2 historical rows ('Listrik') with `overhead_hours = 4` that had `item_type = 'MATERIAL'` and `unit_price = 0.00`.
- Authored migration `20261018000000_enable_overhead_item_type_in_rab_items.sql`.
- Applied migration successfully to Supabase PostgreSQL:
  - `rab_items_item_type_check` expanded to `CHECK (item_type IN ('MATERIAL', 'LABOR', 'OVERHEAD'))`.
  - Historical rows backfilled to `item_type = 'OVERHEAD'` and `unit_price = 1600000.00`.
  - `view_wbs_cost_variance` synchronized; live query verified `total_overhead_budget = 800000.00` per stage.
- Updated `src/types/database.ts` to include `'OVERHEAD'` in `RabItemRecord.item_type`.
- Updated `src/components/RabCalculator.tsx`:
  - `DbRabItemRecord` interface includes `'OVERHEAD'`.
  - `fetchExistingRab` parses `dbItem.item_type === 'OVERHEAD'`.
  - `handleSaveEstimation` persists `item_type: 'OVERHEAD'`, keeps `unit_price`, sets `material_id: null`.
- Added new test in `RabCalculatorOverhead.test.tsx`:
  - `persists overhead items with item_type="OVERHEAD", non-zero unit_price, and null material_id` passed.
- Ran all 16 Vitest test suites: 130 tests passed (100%).
- Ran `tsc -b` and `npm run build`: built cleanly in 521ms.
