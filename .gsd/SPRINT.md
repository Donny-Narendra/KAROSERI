# Sprint 90 — Implement Itemized Assembly Package vs Granular Profit Segregation in RAB Perubahan and Job Profitability

> **Duration**: 2026-10-24 to 2026-10-24
> **Status**: Completed

## Goal
Implement a segregated 2-pillar profit calculation model (Itemized Assembly Packages vs. Granular / Non-Package Material, Labor, and Overhead) across the Service Advisor (`RabPerubahanTab.tsx`), financial exports (`rabPerubahanExport.ts`), and Executive Financial Reports (`JobProfitabilityTab.tsx`), preventing package assembly labor from contaminating standalone labor margins and giving workshop owners granular visibility into per-package margins.

## Scope

### Included
- **Task 1: Segregated Profit Calculation Helper (`src/utils/profitCalculator.ts`)**
  - Implement `computeSegregatedProjectProfit(items, packageMasters)` according to the mathematical model.
  - Support Pilar 1 (Itemized packages: `packageId`, `packageName`, `instanceId`, `sellingPrice`, `materialCost`, `laborCost`, `overheadCost`, `totalCost`, `netProfit`, `marginPercentage`, plus totalPackageRevenue, totalPackageCost, totalPackageProfit).
  - Support Pilar 2 (Granular / Non-Package: granularMaterial, granularLabor, granularOverhead with revenue, cost, profit, marginPct, plus totalGranularRevenue, totalGranularCost, totalGranularProfit).
  - Calculate Grand Total project revenue, cost, profit, and margin percentage.
  - Comprehensive unit test suite in `src/utils/__tests__/profitCalculator.test.ts`.
- **Task 2: Refactor RAB Perubahan Profit Display & Export Integration (`RabPerubahanTab.tsx` & `rabPerubahanExport.ts`)**
  - Reconstruct the profit section in `RabPerubahanTab.tsx` into a 2-pillar layout:
    - Pilar 1: Itemized Assembly Packages breakdown table/cards showing each package's Selling Price, Material HPP, Labor HPP, Overhead HPP, Total HPP, Net Profit, and Margin %.
    - Pilar 2: Granular / Lepas metrics (Material, Labor, Overhead).
    - Ensure labor summary card (`data-testid="pillar-labor-card"`) reflects pure granular labor without contamination from internal package recipe labor.
  - Update `computeRabPerubahanTotals` in `rabPerubahanExport.ts` to properly segregate package components (material, labor, overhead) into package costs, preventing package labor from being counted as granular labor.
  - Update Excel (`exportRabPerubahanToExcel`) and PDF (`printRabPerubahanReport`) exports to reflect itemized package breakdown and segregated granular metrics.
- **Task 3: Itemized Package vs Granular Profit Inspection in Job Profitability (`JobProfitabilityTab.tsx`)**
  - Integrate itemized profit breakdown inspection in `JobProfitabilityTab.tsx`.
  - Add interactive modal drill-down (`ItemizedProfitModal.tsx`) allowing owners to inspect the Itemized Assembly Margin vs Granular Segregated Margin per SPK.
  - Reconcile table columns, footer aggregates, and export utilities.
- **Task 4: Automated Testing & Verification**
  - Add unit tests for `profitCalculator.ts` covering multi-package, single-package, granular-only, and mixed scenarios.
  - Update and expand test suites in `RabPerubahanTab.test.tsx`, `JobProfitabilityTab.test.tsx`, and `rabPerubahanExport.test.ts`.
  - Verify SPK-3093 and mixed-scenario financial reconciliation.
  - Run `npx oxlint` and `npm run build` / `npm test`.

### Explicitly Excluded
- Modifying underlying PostgreSQL schema (calculations and segregation are performed using existing fields in frontend services and utilities).
- Modifying finalized past invoice receipts in `invoices` table.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| Task 1: Create pure utility helper `computeSegregatedProjectProfit` in `src/utils/profitCalculator.ts` with unit tests | Claude | ✅ Done | 0.5 |
| Task 2: Reconstruct profit section in `RabPerubahanTab.tsx` & update `rabPerubahanExport.ts` with Itemized Assembly Margins | Claude | ✅ Done | 0.75 |
| Task 3: Implement itemized profit breakdown drill-down in `JobProfitabilityTab.tsx` | Claude | ✅ Done | 0.5 |
| Task 4: Automated testing, verification, linting, and production build | Claude | ✅ Done | 0.5 |

## Daily Log

### 2026-10-24
- Sprint 89 archived to `.gsd/sprints/sprint-89-synchronize-financial-quotation-and-cost-breakdown-between-rab-perubahan-and-kasir-billing.md`.
- Sprint 90 created. Scope, mathematical models, and architectural plan defined.
- Task 1: Implemented `src/utils/profitCalculator.ts` with flexible catalog lookups (`Map`, `Array`, `Record`) and wrote 5 unit tests in `src/utils/__tests__/profitCalculator.test.ts` (all green).
- Task 2: Refactored `RabPerubahanTab.tsx` to display Pilar 1 (Itemized Assembly Packages card grid) and Pilar 2 (Pure Granular Material, Labor, Overhead). Pure granular labor is strictly isolated from package assembly labor. Updated `rabPerubahanExport.ts` with `itemizedPackages` and segregated Excel and print reports.
- Task 3: Created `ItemizedProfitModal.tsx` drill-down modal and integrated "📦 Rincian Laba" button in `JobProfitabilityTab.tsx`. Added unit tests for both modal and tab.
- Task 4: Verified all test suites (65 files, 478 tests passing), fixed linter warnings (`oxlint` 0 errors), verified `tsc -b && vite build` (build success in 421ms).
