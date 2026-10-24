# Sprint 88 — Fix Labor Summary Card Calculation and Reactive Filter Totals in RAB Perubahan Tab

> **Duration**: 2026-10-24 to 2026-10-24
> **Status**: In Progress

## Goal
Align and fix the 4-pillar Labor summary card calculation on the "RAB Perubahan" tab in Service Advisor to aggregate all labor items (both granular and package assembly components), ensure the labor margin, revenue, and COGS match empirical totals, and synchronize the reactive filter subtotal badge dynamically when filtering by item type or attributes.

## Scope

### Included
- **Task 1: Fix Labor Aggregation in Calculation Utilities (`rabPerubahanExport.ts`)**
  - Update `computeRabPerubahanTotals` so labor items (`item.item_type === 'LABOR'`) are prioritized before package checks, ensuring all labor items (whether granular or part of an assembly BOM package) are aggregated into `laborRevenue`, `laborCost`, and `laborProfit`.
  - Maintain non-double-counting integrity for `packageRevenue`, `granularMaterialRevenue`, and `overheadRevenue`.
- **Task 2: Fix Labor Summary Card & Reactive Filter Subtotal in `RabPerubahanTab.tsx`**
  - Define `formatRupiah` utility helper for consistent Indonesian currency representation.
  - Compute dedicated labor totals (`laborItems`, `totalLaborRevenue`, `totalLaborCogs`, `totalLaborMargin`).
  - Compute reactive filtered totals (`filteredTotalRevenue`, `filteredTotalCogs`, `filteredTotalMargin`).
  - Update the "Labor (Jasa Mandor)" card to display the full labor selling price, modal cost, and profit margin.
  - Ensure the "Subtotal Filter" badge dynamically displays the active filtered total (matching Rp 2.882.794 when filtered to Labor).
- **Task 3: Automated Testing & Verification**
  - Add unit tests in `rabPerubahanExport.test.ts` for package labor items aggregation.
  - Add integration tests in `RabPerubahanTab.test.tsx` verifying Labor card numbers (Modal: Rp 2.100.000, Jual: Rp 2.882.794, Margin: Rp 782.794) and filter reactivity.
  - Validate with TypeScript type check (`tsc -b`), linter (`oxlint`), Vitest suite, and production build (`npm run build`).

### Explicitly Excluded
- Database schema changes (calculations are performed on aggregated contract and change order items in frontend service layer).
- Modifying cashier billing calculations or invoice printing layouts.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| Task 1: Update `computeRabPerubahanTotals` in `rabPerubahanExport.ts` for all labor items | Claude | ⬜ Todo | 0.5 |
| Task 2: Update `RabPerubahanTab.tsx` labor aggregation, card rendering, and filter badge | Claude | ⬜ Todo | 0.5 |
| Task 3: Unit and component tests, linting, and quality gate verification | Claude | ⬜ Todo | 0.5 |

## Daily Log

### 2026-10-24
- Sprint created. Scope and objectives verified.
