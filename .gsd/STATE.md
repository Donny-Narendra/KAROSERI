## Current Position
- **Sprint**: Sprint 74 — Add WBS Column and Ascending WBS Sorting to Mandor Requests and Recent Material Issues Tables
- **Status**: Sprint completed
- **Milestone**: Core Business Recommendations Hardening — Enterprise Production Readiness (ready to resume)

## Last Session Summary
Sprint 74 (2026-10-22):
- **Created WBS Sorting & Formatting Utilities**:
  - Created [`wbsSort.ts`](file:///c:/KAROSERI/src/utils/wbsSort.ts) implementing canonical weighting (1 to 5), badge formatting (`WBS 1: Pembongkaran`, `WBS 2: Sasis/Rangka`, `WBS 3: Dinding/Fabrikasi`, `WBS 4: Pengecatan`, `WBS 5: Kelistrikan/Hidrolik`), distinct badge styling classes, and pure comparator `compareWbsAsc`.
- **Refactored `RecentMaterialIssues.tsx`**:
  - Updated PostgREST queries to join `material_requisitions:requisition_id ( id, wbs_category )` and `material_requisition_items:requisition_item_id ( id, wbs_stage )`, and included `wbs_stage` in fallback `material_issues` query.
  - Implemented `extractIssueWbs(issue)` resolver.
  - Added `WBS` column to table header between `SPK No.` and `Material`, updating `colSpan` to 9.
  - Rendered WBS badge in table rows with color coding.
  - Enforced ascending WBS sorting in `displayedIssues` memo with tie-break by timestamp descending.
- **Refactored `RequisitionApproval.tsx`**:
  - Added `WBS` column to table header in Pending Requisitions: `MATERIAL`, `WBS`, `JUMLAH DIMINTA`, `ESTIMASI HARGA (RP)`, `SUBTOTAL (RP)`, `AKSI / STATUS`.
  - Rendered WBS badge per requested item in table rows.
  - Enforced ascending WBS sorting for items within each requisition.
  - Enforced ascending WBS sorting for parent requisition tickets.
- **Testing & Verification**:
  - Created [`wbsSort.test.ts`](file:///c:/KAROSERI/src/utils/__tests__/wbsSort.test.ts) (7 tests).
  - Expanded [`RecentMaterialIssues.test.tsx`](file:///c:/KAROSERI/src/components/__tests__/RecentMaterialIssues.test.tsx) to 10 tests (verifying WBS header and strict ascending WBS sorting).
  - Created [`RequisitionApprovalWbsSort.test.tsx`](file:///c:/KAROSERI/src/components/__tests__/RequisitionApprovalWbsSort.test.tsx) (3 tests verifying header, item badges, within-ticket sorting, and multi-ticket sorting).
  - All 57 test files (366 tests) passing.

## Quality & Verification Status
- **TypeScript Static Analysis:** Clean compilation with 0 errors (`tsc --noEmit` & `tsc -b`).
- **Production Build:** Clean bundle generated in 510ms (`npm run build`).
- **Automated Tests:** 57 test suites, 366 tests passing (0 failures).

## Technical Debt Backlog
None. (Zero outstanding technical debt).

## Next Up
- Resume milestone work or start new sprint upon user direction.
