## Current Position
- **Sprint**: Sprint 84 — Display Itemized Labor and Overhead Margins on Change Order Cards (Completed)
- **Status**: Sprint Completed (2026-10-24)
- **Milestone**: Core Business Recommendations Hardening — Enterprise Production Readiness (ready to resume)

## Sprint 84 Summary
- **Data & Calculation Layer:**
  - Added `ChangeOrderMarginBreakdown` interface and `computeChangeOrderMargins` helper in `src/utils/financialCalculations.ts`.
  - Re-exported helper from `src/components/AmendmentManager.tsx`, `src/components/ChangeOrdersTab.tsx`, and `src/components/ItemizedChangeOrderForm.tsx`.
  - Correctly segregates margin and revenue across 4 cost pillars:
    - Paket Assembly (`packageMargin`)
    - Granular Material (`materialMargin`)
    - Labor / Jasa (`laborMargin`)
    - Overhead / FOH (`overheadMargin`)
- **Service Advisor UI (Change Order Accordion Card Header):**
  - Updated `AmendmentManager.tsx` card header: beneath the `Margin Laba` metric, rendered transparent, color-coded itemized margin badges:
    - 📦 `Paket: Rp X` (amber badge)
    - 🧱 `Material: Rp X` (cyan badge)
    - 🔧 `Labor: Rp X` (sky badge)
    - ⚡ `Overhead: Rp X` (purple badge)
  - Adjusted summary flex alignment to `items-start` with centered owner actions for layout balance.
- **Quality & Verification Status:**
  - Automated Tests: 61 test suites, 443 tests passing (100% green, +6 tests added).
  - TypeScript Static Analysis: Clean compilation with 0 errors (`tsc -b`).
  - Production Build: Clean bundle generated in 433ms (`npm run build`).

## Next Up
- User verification or review.
