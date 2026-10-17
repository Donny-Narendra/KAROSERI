# Sprint 23 — Fix Zero Labor Budget and Enable LABOR Item Entry in RAB Calculator

> **Duration**: 2026-10-17 to 2026-10-17
> **Status**: In Progress 🟡

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
| 1. Execute database migration replacing generated `item_type` on `rab_items`, updating historical records & `rab_estimations` | Antigravity | ⬜ Todo | 0.4h |
| 2. Upgrade `RabCalculator.tsx` with LABOR item entry, dynamic labor totals, and distinct UI badges | Antigravity | ⬜ Todo | 0.5h |
| 3. Upgrade `PackageAllocationModal.tsx` to preserve `item_type === 'LABOR'` during package allocation | Antigravity | ⬜ Todo | 0.2h |
| 4. Verify finance reports & WBS cost variance data alignment | Antigravity | ⬜ Todo | 0.3h |
| 5. Create automated test suite and validate `npm test`, `npm run lint`, `npm run build` | Antigravity | ⬜ Todo | 0.4h |

## Daily Log

### 2026-10-17
- Analyzed root cause of `Rp 0` "PAGU JASA": `rab_items.item_type` was defined as `GENERATED ALWAYS AS (CASE WHEN (labor_hours > 0 OR labor_rate > 0) THEN 'LABOR' ELSE 'MATERIAL' END) STORED` while `RabCalculator` was hardcoding `labor_hours: 0, labor_rate: 0` and `totalLaborCost = 0`.
- Initialized Sprint 23: Fix Zero Labor Budget and Enable LABOR Item Entry in RAB Calculator.
