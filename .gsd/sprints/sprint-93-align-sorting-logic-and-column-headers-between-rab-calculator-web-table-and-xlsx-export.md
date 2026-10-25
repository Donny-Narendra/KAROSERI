# Sprint 93 — Align Sorting Logic and Column Headers Between RAB Calculator Web Table and XLSX Export

> **Duration**: 2026-10-25 to 2026-10-25
> **Status**: Completed

## Goal
Synchronize the column headers, column order, sorting order (WBS ascending -> Package items first -> Item name ascending), and summary metrics between the RAB Calculator web table and the XLSX export utility (`rabExport.ts`).

## Scope

### Included
- **Task 1: Centralized RAB Sorting & WBS Weight Helper (`src/utils/rabSort.ts`)**
  - Created `getWbsWeight(wbs)` to rank WBS stages 1 to 5:
    - 1: Pembongkaran
    - 2: Sasis/Rangka
    - 3: Dinding/Fabrikasi
    - 4: Pengecatan / Cat / Finishing
    - 5: Kelistrikan / Hidrolik
    - Default: 99
  - Created `sortRabItems(items)` with 3-tier deterministic sorting:
    1. Primary: WBS stage ascending
    2. Secondary: Package items before granular items
    3. Tertiary: Alphabetical item name (case-insensitive)
  - Supports both camelCase (`wbsCategory`, `packageName`, `packageId`, `description`) and snake_case (`wbs_category`, `wbs_stage`, `package_name`, `package_id`, `material_name`) fields without mutating the input array.
- **Task 2: Apply Sorting & Column Structure to Web Table (`src/components/RabCalculator.tsx`)**
  - Memoized sorted items via `const sortedDisplayItems = useMemo(() => sortRabItems(items), [items]);`
  - Updated web table header and column sequence:
    `NO` | `DESCRIPTION` | `SUMBER / PAKET` | `TYPE` | `WBS` | `QTY` | `HARGA SATUAN` | `HARGA MODAL (HPP)` | `SUBTOTAL` | `AKSI / STATUS`
  - Rendered row index `index + 1` in the first `NO` column.
- **Task 3: Align Column Headers, Sorting, & Financial Summary in Excel Export (`src/utils/rabExport.ts`)**
  - Sorted export items using `sortRabItems(rabItems)` before generating sheet rows.
  - Set XLSX table header row to:
    `['NO', 'DESCRIPTION', 'SUMBER / PAKET', 'TYPE', 'WBS', 'QTY', 'HARGA SATUAN', 'HARGA MODAL (HPP)', 'SUBTOTAL']`
  - Populated each data row with row index, description, package/granular source label, uppercase item type, WBS stage label, quantity with unit, unit price, cost price (HPP), and subtotal.
  - Appended summary rows at the bottom for Total Penawaran (Quotation), Total Modal (HPP), and Margin Profit (Rp & %).
  - Aligned `printRabQuotation` to use the same sorting mechanism.
- **Task 4: Automated Testing & Verification**
  - Added unit tests in `src/utils/__tests__/rabSort.test.ts` verifying WBS weights, package precedence, alphabetical sorting, and array immutability.
  - Updated `src/utils/__tests__/rabExport.test.ts` to assert identical column headers and row formatting.
  - Updated `src/components/__tests__/RabCalculatorOrigin.test.tsx` to assert the `NO` column.
  - Verified all 71 test suites (512 tests) pass, zero oxlint errors, and production build succeeds (`tsc -b && vite build` in 1.96s).

### Explicitly Excluded
- Changing database schema or backend RPC functions.
- Altering SPK Borongan or Material Requisition workflows.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| Task 1: Create centralized sorting helper in `src/utils/rabSort.ts` | Claude | ✅ Done | 0.25 |
| Task 2: Align web table columns and sorting in `src/components/RabCalculator.tsx` | Claude | ✅ Done | 0.25 |
| Task 3: Align columns, sorting, and totals in `src/utils/rabExport.ts` | Claude | ✅ Done | 0.25 |
| Task 4: Add unit tests, verify linting, and validate production build | Claude | ✅ Done | 0.25 |

## Daily Log

### 2026-10-25
- Sprint 92 closed and archived.
- Sprint 93 initialized: Align Sorting Logic and Column Headers Between RAB Calculator Web Table and XLSX Export.
- Task 1: Built `src/utils/rabSort.ts` exporting `getWbsWeight`, `isItemFromPackage`, and `sortRabItems`.
- Task 2: Updated `src/components/RabCalculator.tsx` to memoize `sortedDisplayItems` and add `NO` column.
- Task 3: Updated `src/utils/rabExport.ts` to sort items before XLSX sheet creation, align 9 column headers identically with the web table, and append Total Penawaran (Quotation), Total Modal (HPP), and Margin Profit summary rows.
- Task 4: Added comprehensive unit tests in `src/utils/__tests__/rabSort.test.ts` (15 tests), updated `rabExport.test.ts` and `RabCalculatorOrigin.test.tsx`. Passed 71 test suites (512 tests), zero oxlint errors, and successful production build.
