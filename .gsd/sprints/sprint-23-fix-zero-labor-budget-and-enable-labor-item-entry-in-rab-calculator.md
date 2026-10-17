# Sprint 23 — Fix Zero Labor Budget and Enable LABOR Item Entry in RAB Calculator

> **Duration**: 2026-10-17 to 2026-10-17
> **Status**: Completed ✅

## Goal
Fix zero labor budget in WBS variance reports (`/finance-reports`) by transitioning `rab_items.item_type` from a locked generated column to an editable column with standard `'MATERIAL' | 'LABOR'` defaults, backfilling historical labor items across `rab_items` and `change_order_items`, enabling explicit `LABOR` item entry and BOM package allocation in `RabCalculator` and `PackageAllocationModal`, and synchronizing real labor budgets in `rab_estimations` and `view_wbs_cost_variance`.

## Scope

### Included
- **Database Schema & Historical Data Migration**:
  - Replace generated `item_type` on `public.rab_items` with standard `VARCHAR(20) DEFAULT 'MATERIAL'`.
  - Recreate `view_wbs_cost_variance` with enhanced variance calculation.
  - Backfill historical `rab_items` and `change_order_items` where item name contains workshop labor keywords (`jasa`, `ongkos`, `borongan`, `tukang`, `upah`, `tenaga`).
  - Backfill `total_labor_cost` and `total_material_cost` on `public.rab_estimations` based on updated item types.
  - Document migration in `supabase/migrations/20261017000000_enable_labor_item_type_in_rab_items.sql`.
- **RAB Calculator Component (`src/components/RabCalculator.tsx`)**:
  - Expand `RabItem` interface to support distinct `type: 'material' | 'labor' | 'overhead'`.
  - Add explicit item type selector (`Material`, `Tenaga Kerja / Jasa (Labor)`, `Overhead`).
  - Enable input of labor items (description, quantity, unit rate, automatic 0% waste factor).
  - Update `handleSaveEstimation` to save `item_type: 'LABOR'`, `labor_hours`, and `labor_rate`.
  - Calculate `totalLaborCost` dynamically from labor items instead of hardcoded 0.
  - Update `fetchExistingRab` item loader to recognize `dbItem.item_type === 'LABOR'` or labor attributes.
  - Add distinct UI visual badges for `LABOR` items in the estimation table.
- **Package BOM Allocation (`src/components/PackageAllocationModal.tsx`)**:
  - Allow `RabItemPayload` to preserve `type: 'labor'` when package BOM items have `item_type === 'LABOR'`.
  - Pass allocated labor items to `RabCalculator` with appropriate labor types.
- **Export & Financial Reporting Consistency**:
  - Verify `rabExport.ts`, `WbsCostVarianceTab.tsx`, and `FinancialPrintReport.tsx` correctly display pagu jasa.
- **Automated Tests & Empirical Verification**:
  - Add automated component and unit tests covering `RabCalculator` labor item entry, labor calculation, and WBS variance resolution.
  - Verify full test suite (`npm test`), linter (`npm run lint`), and production build (`npm run build`).

### Explicitly Excluded
- Changing the 7 standard WBS categories or fabrication workflow stages.
- Altering existing SPK billing trigger policies or handover gates.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Execute database migration replacing generated `item_type` on `rab_items`, updating historical records & `rab_estimations` | Antigravity | ✅ Done | 0.4h |
| 2. Upgrade `RabCalculator.tsx` with LABOR item entry, dynamic labor totals, and distinct UI badges | Antigravity | ✅ Done | 0.5h |
| 3. Upgrade `PackageAllocationModal.tsx` to preserve `item_type === 'LABOR'` during package allocation | Antigravity | ✅ Done | 0.2h |
| 4. Verify finance reports & WBS cost variance data alignment | Antigravity | ✅ Done | 0.3h |
| 5. Create automated test suite and validate `npm test`, `npm run lint`, `npm run build` | Antigravity | ✅ Done | 0.4h |

## Daily Log

### 2026-10-17
- Analyzed root cause of `Rp 0` "PAGU JASA": `rab_items.item_type` was defined as `GENERATED ALWAYS AS (CASE WHEN (labor_hours > 0 OR labor_rate > 0) THEN 'LABOR' ELSE 'MATERIAL' END) STORED` while `RabCalculator` was hardcoding `labor_hours: 0, labor_rate: 0` and `totalLaborCost = 0`.
- Initialized Sprint 23: Fix Zero Labor Budget and Enable LABOR Item Entry in RAB Calculator.
- Executed PostgreSQL schema migration `20261017000000_enable_labor_item_type_in_rab_items.sql`:
  - Dropped generated `item_type` on `rab_items` and created standard editable `VARCHAR(20) DEFAULT 'MATERIAL'`.
  - Backfilled 58 historical `rab_items` records matching workshop labor keywords (`jasa`, `ongkos`, `borongan`, `tukang`, `upah`, `tenaga`).
  - Backfilled `rab_estimations.total_labor_cost` and `total_material_cost`.
  - Recreated `view_wbs_cost_variance` with unified active stage aggregation and item_total fallback.
- Upgraded `RabCalculator.tsx`:
  - Added 3-way toggle (Bahan Baku, Jasa / Labor, Overhead) with Lucide icons (`Package`, `Wrench`, `Clock`).
  - Implemented specific inputs for labor description, quantity, and rate (without waste factor).
  - Calculated `totalLaborCost` dynamically from labor items.
  - Persisted `item_type: 'LABOR'` and labor metrics into database.
  - Rendered distinct amber `JASA` badge in estimation table.
  - Added 3-way cost breakdown (Pagu Material, Pagu Jasa, Overhead) in footer summary.
- Upgraded `PackageAllocationModal.tsx` to preserve `type: 'labor'` when package BOM items have `item_type === 'LABOR'`.
- Updated `src/types/database.ts` and `src/utils/rabExport.ts` types.
- Created unit tests `src/utils/__tests__/rabLaborBudget.test.ts` (8 tests) and component tests `src/components/__tests__/RabCalculatorLabor.test.tsx` (4 tests).
- Verified full test suite (`npm test`: 83/83 passing across 11 files), clean TypeScript compilation (`tsc -b`), 0 linter errors (`npm run lint`), and successful production build (`npm run build`).

## Retrospective (2026-10-17)

### What Went Well
- Immediate identification of the database column constraint (`is_generated = ALWAYS`) and hardcoded zeroes in `RabCalculator`.
- Seamless backfill of 58 historical labor items, which instantly restored real labor budgets in `view_wbs_cost_variance` (e.g. SPK-5902, SPK-1452, SPK-6633) and eliminated false `OVERBUDGET` flags.
- Clean 3-way UI toggle that improves SA ergonomics and prevents accidental assignment of waste factors to labor hours.
- 100% test pass rate (83/83) and zero linter errors.

### What Could Improve
- Ensuring database views are tested with end-to-end integration mocks so generated column limitations are flagged earlier.

### Action Items
- [x] Archive Sprint 23 to `.gsd/sprints/sprint-23-fix-zero-labor-budget-and-enable-labor-item-entry-in-rab-calculator.md`.
- [x] Update `.gsd/STATE.md` with completed sprint status.
