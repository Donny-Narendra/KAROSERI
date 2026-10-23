# Sprint 84 — Display Itemized Labor and Overhead Margins on Change Order Cards

> **Duration**: 2026-10-24 to 2026-10-24
> **Status**: Completed

## Goal
Display itemized margin breakdown across 4 cost pillars (Assembly Packages, Granular Materials, Labor/Tukang, and Overhead/FOH) right below the `MARGIN LABA` metric on each Change Order accordion card in Service Advisor to deliver full financial transparency.

## Scope

### Included
- **Task 1: Helper Perhitungan Margin per Item Type (`computeChangeOrderMargins`)**
  - Implemented and exported `computeChangeOrderMargins(items: Array<any>): ChangeOrderMarginBreakdown` in `src/utils/financialCalculations.ts` and re-exported in `src/components/AmendmentManager.tsx`, `src/components/ChangeOrdersTab.tsx`, and `src/components/ItemizedChangeOrderForm.tsx`.
  - Calculates `packageMargin`, `materialMargin`, `laborMargin`, `overheadMargin`, `totalProfit`, and respective revenues.
  - Correctly segregates items based on package origin (`package_source_id`, `package_name`, `product_packages`, or notes prefix) and item types (`MATERIAL`, `LABOR`, `OVERHEAD`).
- **Task 2: Accordion Card UI Itemized Margin Indicators**
  - Updated `AmendmentManager.tsx` card header: beneath the `Margin Laba` metric, rendered itemized 4-pillar badges/indicators:
    - 📦 Paket: `Rp X` (`bg-amber-500/10 text-amber-400 border border-amber-500/20`)
    - 🧱 Material: `Rp X` (`bg-cyan-500/10 text-cyan-400 border border-cyan-500/20`)
    - 🔧 Labor: `Rp X` (`bg-sky-500/10 text-sky-400 border border-sky-500/20`)
    - ⚡ Overhead: `Rp X` (`bg-purple-500/10 text-purple-400 border border-purple-500/20`)
  - Maintained elegant dark UI aesthetics with consistent pillar colors and non-overflowing wrap presentation.
- **Task 3: Automated Testing & Quality Gate Verification**
  - Added unit tests for `computeChangeOrderMargins` in `src/utils/__tests__/segregatedProfitCalculations.test.ts` (consistency, edge cases, formula accuracy).
  - Added component tests in `src/components/__tests__/AmendmentManager.test.tsx` verifying card header rendering with 4-pillar margin values and legacy empty states.
  - Ran TypeScript compiler (`tsc -b`), full Vitest suite (61 suites, 443 tests passing), and production build.

### Explicitly Excluded
- Modifying SPK creation, WBS checklist, or material requisition flows.
- Modifying cashflow / billing calculator logic.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Implement `computeChangeOrderMargins` helper in `financialCalculations.ts` & `AmendmentManager.tsx` | Antigravity | ✅ Completed | 0.5h |
| 2. Add 4-pillar itemized margin indicators under `Margin Laba` in `AmendmentManager.tsx` | Antigravity | ✅ Completed | 0.5h |
| 3. Add automated tests and verify quality gates (`npm test`, `tsc`, `npm run build`) | Antigravity | ✅ Completed | 0.5h |

## Daily Log

### 2026-10-24
- Initialized Sprint 84.
- Archived Sprint 83 to `.gsd/sprints/sprint-83-add-source-origin-column-to-change-order-snapshot-table-in-service-advisor.md`.
- Implemented Task 1:
  - Created `ChangeOrderMarginBreakdown` interface and `computeChangeOrderMargins` function in `src/utils/financialCalculations.ts`.
  - Re-exported in `src/components/AmendmentManager.tsx`, `src/components/ChangeOrdersTab.tsx`, and `src/components/ItemizedChangeOrderForm.tsx`.
- Implemented Task 2:
  - Updated Change Order accordion card header in `AmendmentManager.tsx` to calculate `margins = computeChangeOrderMargins(co.items || [])`.
  - Rendered 4 itemized badges for Paket (amber), Material (cyan), Labor (sky), and Overhead (purple) below `Margin Laba`.
- Implemented Task 3:
  - Added 4 unit tests in `src/utils/__tests__/segregatedProfitCalculations.test.ts`.
  - Added 2 integration/component tests in `src/components/__tests__/AmendmentManager.test.tsx`.
  - Ran static typecheck: `tsc -b` passed with 0 errors.
  - Ran full test suite: 61 test files, 443 tests passing (100% green).
  - Built production bundle: `npm run build` succeeded in 433ms.
