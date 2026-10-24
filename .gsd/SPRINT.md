# Sprint 88 — Fix Labor Summary Card Calculation and Reactive Filter Totals in RAB Perubahan Tab

> **Duration**: 2026-10-24 to 2026-10-24
> **Status**: Completed

## Goal
Align and fix the 4-pillar Labor summary card calculation on the "RAB Perubahan" tab in Service Advisor to aggregate all labor items (both granular and package assembly components), ensure the labor margin, revenue, and COGS match empirical totals, and synchronize the reactive filter subtotal badge dynamically when filtering by item type or attributes.

## Scope

### Included
- **Task 1: Fix Labor Aggregation in Calculation Utilities (`rabPerubahanExport.ts`)**
  - Updated `computeRabPerubahanTotals` so labor items (`item.item_type === 'LABOR'`) and overhead (`item.item_type === 'OVERHEAD'`) are evaluated before package checks, ensuring all labor items (whether granular or part of an assembly BOM package) are aggregated into `laborRevenue`, `laborCost`, and `laborProfit`.
  - Maintained non-double-counting integrity for `packageRevenue`, `granularMaterialRevenue`, and `overheadRevenue`.
- **Task 2: Fix Labor Summary Card & Reactive Filter Subtotal in `RabPerubahanTab.tsx`**
  - Defined `formatRupiah` utility helper for standard Indonesian currency formatting (`Rp X.XXX.XXX`).
  - Computed dedicated labor totals (`laborItems`, `totalLaborRevenue`, `totalLaborCogs`, `totalLaborMargin`).
  - Computed reactive filtered totals (`filteredTotalRevenue`, `filteredTotalCogs`, `filteredTotalMargin`).
  - Updated the "Labor (Jasa Mandor)" card to display the complete labor selling price (`totalLaborRevenue`), modal cost (`totalLaborCogs`), and profit margin (`totalLaborMargin`).
  - Aligned the "Subtotal Filter" badge to display `Subtotal Filter: {formatRupiah(filteredTotalRevenue)}` whenever filters are active, matching exactly Rp 2.882.794 when filtered to Labor.
- **Task 3: Automated Testing & Verification**
  - Added unit test in `rabPerubahanExport.test.ts` verifying aggregation of 4 labor items (3 package components + 1 granular) totaling Modal: Rp 2.100.000, Jual: Rp 2.882.794, Margin: Rp 782.794.
  - Added integration tests in `RabPerubahanTab.test.tsx` verifying Labor card rendering and reactive subtotal filter badge.
  - Validated with TypeScript static typing (`tsc -b`), linter (`oxlint`: 0 errors), Vitest suite (63 suites, 465 tests passing, 100% green), and production build (`npm run build`).

### Explicitly Excluded
- Database schema changes (calculations are performed on aggregated contract and change order items in frontend service layer).
- Modifying cashier billing calculations or invoice printing layouts.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| Task 1: Update `computeRabPerubahanTotals` in `rabPerubahanExport.ts` for all labor items | Claude | ✅ Done | 0.5 |
| Task 2: Update `RabPerubahanTab.tsx` labor aggregation, card rendering, and filter badge | Claude | ✅ Done | 0.5 |
| Task 3: Unit and component tests, linting, and quality gate verification | Claude | ✅ Done | 0.5 |

## Daily Log

### 2026-10-24
- Sprint created. Scope and objectives verified.
- Task 1: Updated `computeRabPerubahanTotals` in `src/utils/rabPerubahanExport.ts` to prioritize `item.item_type === 'LABOR'` and `'OVERHEAD'` before checking `is_package`.
- Task 2: Updated `src/components/service_advisor/RabPerubahanTab.tsx` with `formatRupiah`, `laborItems` aggregation, `totalLaborRevenue`, `totalLaborCogs`, `totalLaborMargin`, updated the "Labor (Jasa Mandor)" card JSX, and made the "Subtotal Filter" badge reactive to active filters.
- Task 3: Added unit test in `src/utils/__tests__/rabPerubahanExport.test.ts` and integration tests in `src/components/service_advisor/__tests__/RabPerubahanTab.test.tsx`.
- Ran full test suite (63 suites, 465 tests passing, 100% green), `tsc -b` (clean), `oxlint` (0 errors), and `npm run build` (clean production bundle in 510ms).
