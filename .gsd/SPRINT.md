# Sprint 84 — Display Itemized Labor and Overhead Margins on Change Order Cards

> **Duration**: 2026-10-24 to 2026-10-24
> **Status**: In Progress

## Goal
Display itemized margin breakdown across 4 cost pillars (Assembly Packages, Granular Materials, Labor/Tukang, and Overhead/FOH) right below the `MARGIN LABA` metric on each Change Order accordion card in Service Advisor to deliver full financial transparency.

## Scope

### Included
- **Task 1: Helper Perhitungan Margin per Item Type (`computeChangeOrderMargins`)**
  - Implement and export `computeChangeOrderMargins(items: Array<any>): ChangeOrderMarginBreakdown` in `src/utils/financialCalculations.ts` and re-export in `src/components/AmendmentManager.tsx` & `src/components/ChangeOrdersTab.tsx`.
  - Calculate `packageMargin`, `materialMargin`, `laborMargin`, `overheadMargin`, `totalProfit`, and respective revenues.
  - Correctly segregate items based on package origin (`package_source_id`, `package_name`, or notes prefix) and item types (`MATERIAL`, `LABOR`, `OVERHEAD`).
- **Task 2: Accordion Card UI Itemized Margin Indicators**
  - Update `AmendmentManager.tsx` card header: beneath the `Margin Laba` metric, render itemized 4-pillar badges/indicators:
    - 📦 Paket: `Rp X`
    - 🧱 Material: `Rp X`
    - 🔧 Labor: `Rp X`
    - ⚡ Overhead: `Rp X`
  - Maintain elegant dark UI aesthetics with consistent pillar colors (amber for packages, cyan/emerald for material, sky for labor, purple for overhead).
  - Ensure responsive, compact, and scannable presentation.
- **Task 3: Automated Testing & Quality Gate Verification**
  - Add unit tests for `computeChangeOrderMargins` in `src/utils/__tests__/segregatedProfitCalculations.test.ts`.
  - Add component tests in `src/components/__tests__/AmendmentManager.test.tsx` verifying card header rendering with 4-pillar margin values.
  - Run linting, TypeScript compiler, and full Vitest suite.

### Explicitly Excluded
- Modifying SPK creation, WBS checklist, or material requisition flows.
- Modifying cashflow / billing calculator logic.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Implement `computeChangeOrderMargins` helper in `financialCalculations.ts` & `AmendmentManager.tsx` | Antigravity | ⬜ Todo | 0.5h |
| 2. Add 4-pillar itemized margin indicators under `Margin Laba` in `AmendmentManager.tsx` | Antigravity | ⬜ Todo | 0.5h |
| 3. Add automated tests and verify quality gates (`npm test`, `tsc`, `npm run build`) | Antigravity | ⬜ Todo | 0.5h |

## Daily Log

### 2026-10-24
- Initialized Sprint 84.
- Archived Sprint 83 to `.gsd/sprints/sprint-83-add-source-origin-column-to-change-order-snapshot-table-in-service-advisor.md`.
