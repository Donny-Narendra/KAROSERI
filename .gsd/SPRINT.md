# Sprint 96 — Enforce Live Database Aggregation for Pagu, Realisasi, and Variance (Zero Hardcoded Values)

> **Duration**: 2026-10-25 to 2026-10-25
> **Status**: Completed ✓

## Goal
Enforce live database PostgreSQL aggregation for Pagu, Realisasi fisik warehouse, and dynamic Variance across `/finance-reports` tab "2. Varian RAB vs Aktual (per WBS)" and `/dashboard` with zero hardcoded or mockup values.

## Scope

### Included
- **Task 1: Database View `view_wbs_cost_variance` & `goods_issues`**
  - Created migration `supabase/migrations/20261025020000_enforce_live_db_aggregation_wbs_variance.sql`.
  - Created `public.goods_issues` view exposing warehouse approved transactions (`quantity`, `custom_unit_price`, `unit_price`, `status`, `wbs_stage`).
  - Synchronized `rab_items.wbs_stage` with `wbs_category_to_stage(wbs_category)`.
  - Implemented `public.view_wbs_cost_variance` with pure transaction joins:
    * Pagu: `rab_items` + approved `change_order_items` (`quantity * cost_price`).
    * Realisasi Material: `goods_issues` where status is not VOIDED/CANCELLED (`quantity * COALESCE(custom_unit_price, unit_price, 0)`).
    * Realisasi Labor: `spk_borongan` where status is not CANCELLED (`contract_value`).
    * Realisasi Overhead: `spk_overhead_logs` (`total_amount`).
    * Dynamic Variance: `Pagu - Realisasi` for Material, Labor, Overhead, and Total WBS.
    * Status: `OVERBUDGET` vs `HEMAT / DALAM BATAS`.
    * Exclude draft & pending payment SPKs.
  - Granted permissions on `view_wbs_cost_variance` and `goods_issues` to authenticated role.
- **Task 2: Audit Frontend Component (`WbsCostVarianceTab.tsx`)**
  - Verified zero hardcoded/mock arrays (`dummyWbs`, `MOCK_VARIANCE`, etc.).
  - Directly render live Supabase columns for Pagu, Realisasi, and Varian across Material, Jasa, and Overhead:
    * Material: `total_material_budget`, `actual_material_spent`, `material_variance` via `formatRupiah`
    * Jasa: `total_labor_budget`, `actual_labor_spent`, `labor_variance` via `formatRupiah`
    * Overhead: `total_overhead_budget`, `actual_overhead_spent`, `overhead_variance` via `formatRupiah`
    * Status: `wbs_budget_status` badge directly from Supabase.
  - Added compatibility export in `src/components/finance/WbsCostVarianceTab.tsx`.
- **Task 3: Automated Testing & Verification**
  - Updated `WbsCostVarianceTab.test.tsx` and `financialReportsService.test.ts` with tests verifying pure live database rendering.
  - Verified all 72 test suites pass (521 tests green), 0 oxlint errors, and successful production build.

### Explicitly Excluded
- Modifying inventory deduction triggers or altering general ledger double-entry journal creation.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| Task 1: Create SQL migration for goods_issues and view_wbs_cost_variance | Claude | ✅ Done | 0.5 |
| Task 2: Audit and refine WbsCostVarianceTab and financial services | Claude | ✅ Done | 0.5 |
| Task 3: Unit testing, empirical validation, and build verification | Claude | ✅ Done | 0.5 |

## Daily Log

### 2026-10-25
- Sprint 96 started.
- Baseline vitest verified (72 test files, 518 tests green).
- Created migration `supabase/migrations/20261025020000_enforce_live_db_aggregation_wbs_variance.sql`:
  * Created `public.goods_issues` view mapped to warehouse `inventory_transactions`.
  * Backfilled `rab_items.wbs_stage` using `wbs_category_to_stage(wbs_category)`.
  * Rebuilt `public.view_wbs_cost_variance` to strictly aggregate from transactional tables: `rab_items`, `change_order_items`, `goods_issues`, `spk_borongan`, and `spk_overhead_logs`.
  * Applied migration to PostgreSQL live database and verified live rows.
- Refactored `WbsCostVarianceTab.tsx`:
  * Completely free of any static mockup objects (`dummyWbs`, `MOCK_VARIANCE`, fallback constants).
  * Rendered cells directly using `formatRupiah` from Supabase row columns.
  * Rendered `wbs_budget_status` directly from live view.
  * Created clean re-export in `src/components/finance/WbsCostVarianceTab.tsx`.
- Updated `src/types/financialReports.ts` and `src/services/financialReportsService.ts`.
- Verified 72 test suites (521 tests passed), 0 oxlint errors, and successful production build.
