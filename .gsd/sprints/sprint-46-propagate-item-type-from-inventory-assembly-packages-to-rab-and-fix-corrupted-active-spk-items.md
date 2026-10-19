# Sprint 46 — Propagate item_type from Inventory Assembly Packages to RAB and Fix Corrupted Active SPK Items

> **Duration**: 2026-10-19 to 2026-10-19
> **Status**: Completed ✅

## Goal
Propagate `item_type` ('MATERIAL', 'LABOR', 'OVERHEAD') from Inventory Assembly Packages to RAB items, ensure accurate classification of labor and overhead across inventory and package records, and repair corrupted active SPKs (including SPK-2668) where labor services were misclassified as physical materials.

## Scope

### Included
- **Database Migration & Data Repair Patch**:
  - Created `supabase/migrations/20261019010000_fix_inventory_and_rab_item_types.sql` and applied to PostgreSQL database.
  - Added `item_type VARCHAR(20) DEFAULT 'MATERIAL' CHECK (item_type IN ('MATERIAL', 'LABOR', 'OVERHEAD'))` to `public.materials`.
  - Backfilled `materials.item_type` based on category and name patterns (`tukang`, `jasa`, `ongkos`, `borongan`, `upah` -> `LABOR`; `listrik`, `sewa bay`, `sewa kompressor` -> `OVERHEAD`).
  - Relaxed `package_items` constraints (`item_type IN ('MATERIAL', 'LABOR', 'OVERHEAD')`, relaxed `valid_item_details`), and synchronized `package_items.item_type` with `materials.item_type`.
  - Applied data repair patch on `rab_items` for active SPKs (including SPK-2668): converted labor services (`TUKANG CAT BAK`, `TUKANG RANGKA BAK`) to `LABOR` with populated `labor_hours` and `labor_rate`, and overhead items to `OVERHEAD`.
  - Recalculated `rab_estimations` totals (`total_material_cost`, `total_labor_cost`, `total_overhead_cost`, `total_estimated_cost`) for all affected SPKs.
- **Frontend Inventory & Package Types**:
  - Updated `Material` in `src/services/inventoryService.ts` to include `item_type?: 'MATERIAL' | 'LABOR' | 'OVERHEAD'`.
  - Updated `PackageItem` in `src/types/package.ts` to allow `item_type: 'MATERIAL' | 'LABOR' | 'OVERHEAD'`.
- **Frontend Package Management & Allocation Flow**:
  - In `src/components/PackageManager.tsx`, updated `handleAddNewMaterialRow` to propagate `material.item_type` (with resilient fallback detection), display proper badges (BAHAN, JASA, OVERHEAD), and render inventory item names correctly.
  - In `src/components/PackageAllocationModal.tsx`, ensured items inherit `item_type` from `item.item_type`, `item.material?.item_type`, or keyword fallback, and display `item.labor_name || item.material?.name` without unclassified fallbacks.
  - In `src/components/RabCalculator.tsx`, refined `handleApplyPackageAllocation` to only bind `materialId` for material items, keeping labor and overhead clean.
- **Testing & Verification**:
  - Created dedicated unit test suite `src/components/__tests__/PackageAllocationModal.test.tsx` (3/3 passing).
  - Enhanced `src/utils/__tests__/rabLaborBudget.test.ts` (14/14 passing).
  - Empirically verified database state for SPK-2668: `total_material_cost: Rp 265.000`, `total_labor_cost: Rp 1.900.000`, `total_overhead_cost: Rp 250.000`.
  - Full test suite: 21/21 test suites passing, 152/152 tests passing (100%).
  - Linter: 0 warnings, 0 errors across 137 files (Oxlint).
  - TypeScript: Clean static compilation (`npx tsc -b`).
  - Production build: Clean build in 604ms (`npm run build`).

### Explicitly Excluded
- Modifying SPK workflow transitions (handled by existing state machines).
- Deleting historical audit logs.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Create SQL migration & run data repair patch on PostgreSQL database | Antigravity | ✅ Done | 0.3h |
| 2. Update TypeScript interfaces in `inventoryService.ts` and `package.ts` | Antigravity | ✅ Done | 0.1h |
| 3. Update `PackageManager.tsx`, `PackageAllocationModal.tsx`, and `RabCalculator.tsx` | Antigravity | ✅ Done | 0.3h |
| 4. Update unit tests, verify SPK-2668 fix, and run full quality validations | Antigravity | ✅ Done | 0.3h |

## Daily Log

### 2026-10-19
- Initialized Sprint 46 to propagate `item_type` from Assembly Packages to RAB and repair corrupted active SPK items.
- Archived Sprint 45 to `.gsd/sprints/sprint-45-enforce-strict-item-type-material-filter-on-requisition-rab-allocation-panel.md`.
- Inspected database state for SPK-2668: verified 5 corrupted rows of `TUKANG CAT BAK` and `TUKANG RANGKA BAK` stored with `item_type: 'MATERIAL'`.
- Created and executed migration `supabase/migrations/20261019010000_fix_inventory_and_rab_item_types.sql`:
  - Added `item_type` to `materials` master catalog and backfilled LABOR/OVERHEAD classifications.
  - Relaxed `package_items` constraints and synced `package_items.item_type` with `materials.item_type`.
  - Fixed corrupted `rab_items` on SPK-2668 and other active SPKs; set `labor_hours` and `labor_rate`.
  - Recalculated `rab_estimations` totals.
- Verified SPK-2668 post-patch: `total_material_cost: Rp 265.000`, `total_labor_cost: Rp 1.900.000`, `total_overhead_cost: Rp 250.000`, `total_estimated_cost: Rp 2.415.000`.
- Updated `src/services/inventoryService.ts` (`Material.item_type`) and `src/types/package.ts` (`PackageItem.item_type`).
- Updated `src/components/PackageManager.tsx` to propagate `item_type` when adding components, relax validator, and render type badges and component names.
- Updated `src/components/PackageAllocationModal.tsx` to inherit item type and component descriptions accurately.
- Updated `src/components/RabCalculator.tsx` to handle package allocation without erroneous materialId attachments for labor/overhead.
- Created `src/components/__tests__/PackageAllocationModal.test.tsx` (3/3 passed).
- Updated `src/utils/__tests__/rabLaborBudget.test.ts` (14/14 passed).
- Verified full test suite: 21/21 test suites passed, 152/152 tests passed.
- Verified Oxlint: 0 errors, 0 warnings.
- Verified TypeScript check and Vite build: clean build in 604ms.
