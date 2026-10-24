## Current Position
- **Sprint**: Sprint 86 — Fix Default WBS 2 Allocation Initial Value to Zero in Change Order Material Form
- **Status**: Sprint in progress (All tasks implemented & verified)
- **Milestone**: Core Business Recommendations Hardening — Enterprise Production Readiness (paused for sprint)

## Sprint 86 Summary
- **Change Order Builder Form (`AmendmentManager.tsx`, `ItemizedChangeOrderForm.tsx`, `ChangeOrdersTab.tsx`):**
  - Replaced hardcoded `'WBS 2: Sasis/Rangka': '1'` initial and reset state with reusable `DEFAULT_WBS_ALLOCATIONS` constant where all 5 stages (WBS 1 to 5) default to `'0'`.
  - Updated `resetBuilderInputs` to reset `wbsAllocations` to all zeros whenever items are added, cancelled, or when switching between Material, Labor, and Overhead modes.
  - Verified that on initial load with `targetQty = 1` and all WBS stages = 0, the form correctly highlights remaining allocation with badge `Sisa: 1.00` and displays the informative prompt until the user explicitly allocates stages.
- **Automated Testing (`AmendmentManager.test.tsx`):**
  - Updated legacy test assertions where WBS 2 was previously assumed to be automatically filled as 1.
  - Added 3 dedicated Sprint 86 verification tests covering initial all-zero WBS inputs, initial `Sisa: 1.00` badge, dynamic transition to `Sesuai / Pas (0.00)` on user allocation, and proper reset back to zero.
- **Quality & Verification Status:**
  - Automated Tests: 61 test suites, 452 tests passing (100% green, +3 tests added).
  - TypeScript Static Analysis: Clean compilation with 0 errors (`tsc -b`).
  - Linter Check: 0 errors (`npx oxlint`).
  - Production Build: Clean bundle generated (`npm run build`).

## Next Up
- User verification or review.

