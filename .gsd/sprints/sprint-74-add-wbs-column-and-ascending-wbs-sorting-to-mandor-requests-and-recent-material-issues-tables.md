# Sprint 74 — Add WBS Column and Ascending WBS Sorting to Mandor Requests and Recent Material Issues Tables

> **Duration**: 2026-10-22 to 2026-10-23
> **Status**: Completed

## Goal
Add WBS stage information column and enforce ascending WBS sorting (WBS 1 Pembongkaran -> WBS 2 Sasis/Rangka -> WBS 3 Dinding/Fabrikasi -> WBS 4 Pengecatan -> WBS 5 Kelistrikan/Hidrolik) across both "Pending Requisitions (Mandor)" and "Recent Material Issues" tables in `/warehouse` and `/service-advisor` dashboards.

## Scope

### Included
- Create `src/utils/wbsSort.ts` utility providing `getWbsOrderWeight`, `formatWbsBadge`, `getWbsBadgeClass`, and `compareWbsAsc` sorting comparator.
- Update `RecentMaterialIssues.tsx`:
  - Enhance queries to select `material_requisitions:requisition_id(id, wbs_category)` and `material_requisition_items:requisition_item_id(id, wbs_stage)`, plus `wbs_stage` in fallback queries (`material_issues`).
  - Implement `extractIssueWbs(issue)` to reliably resolve WBS stage from direct fields, joined items, or joined requisition records.
  - Add `WBS` column to table header between `SPK No.` and `Material` and update `colSpan` to 9.
  - Render formatted WBS badge per row with canonical stage names and color styles.
  - Sort displayed issues ascending by WBS order weight (WBS 1 -> WBS 2 -> WBS 3 -> WBS 4 -> WBS 5), secondary sort by issue timestamp descending.
- Update `RequisitionApproval.tsx`:
  - Update table header in "Pending Requisitions (Mandor)" to include `WBS` column: `MATERIAL`, `WBS`, `JUMLAH DIMINTA`, `ESTIMASI HARGA (RP)`, `SUBTOTAL (RP)`, `AKSI / STATUS`.
  - Render formatted WBS badge per material item row.
  - Sort material requisition items within each ticket in ascending WBS order.
  - Sort parent requisitions by WBS order ascending.
- Update and add comprehensive unit and integration tests in `wbsSort.test.ts`, `RecentMaterialIssues.test.tsx`, and `RequisitionApprovalWbsSort.test.tsx`.

### Explicitly Excluded
- Database schema alterations or database migrations.
- Altering business logic for Gate 2 budget validations or SPK stage transitions.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Create WBS normalization, badge & sorting helper in `src/utils/wbsSort.ts` | Antigravity | ✅ Done | 0.5h |
| 2. Add WBS column & ascending sort to `RecentMaterialIssues.tsx` | Antigravity | ✅ Done | 1h |
| 3. Add WBS column & ascending sort to `RequisitionApproval.tsx` | Antigravity | ✅ Done | 1h |
| 4. Write unit & integration tests (`wbsSort.test.ts`, `RecentMaterialIssues.test.tsx`, `RequisitionApprovalWbsSort.test.tsx`) | Antigravity | ✅ Done | 0.5h |
| 5. Quality verification (Vitest, Oxlint, TypeScript compilation, Build) | Antigravity | ✅ Done | 0.5h |

## Daily Log

### 2026-10-22
- Sprint 74 initialized.
- Archived Sprint 73 into `.gsd/sprints/sprint-73-fix-empty-recent-material-issues-table-in-warehouse-and-service-advisor.md`.
- Verified live database schema: `material_requisitions` contains `wbs_category`, `material_requisition_items` contains `wbs_stage`, and `inventory_transactions` connects via `requisition_id` and `requisition_item_id`. `material_issues` view already projects `wbs_stage`.
- Created `src/utils/wbsSort.ts`:
  - `getWbsOrderWeight`: Normalizes strings and maps WBS 1 (Pembongkaran), WBS 2 (Sasis/Rangka), WBS 3 (Dinding/Fabrikasi), WBS 4 (Pengecatan/Cat/Finishing), WBS 5 (Kelistrikan/Hidrolik) to weights 1-5; unmapped/falsy to 99.
  - `formatWbsBadge`: Formats WBS stage into human-friendly canonical labels (`WBS 1: Pembongkaran`, `WBS 2: Sasis/Rangka`, `WBS 3: Dinding/Fabrikasi`, `WBS 4: Pengecatan`, `WBS 5: Kelistrikan/Hidrolik`).
  - `getWbsBadgeClass`: Returns color classes per stage for visual hierarchy.
  - `compareWbsAsc`: Pure comparator for ascending stage sequence.
- Implemented `RecentMaterialIssues.tsx`:
  - Integrated WBS joins in `inventory_transactions` query (`material_requisitions:requisition_id(id, wbs_category)` and `material_requisition_items:requisition_item_id(id, wbs_stage)`).
  - Selected `wbs_stage` in `material_issues` query.
  - Implemented `extractIssueWbs(issue)` extraction helper.
  - Added `WBS` header column and row badge cell.
  - Implemented ascending WBS sort in `displayedIssues` memo with search support for WBS keywords.
- Implemented `RequisitionApproval.tsx`:
  - Added `WBS` column to table header: `MATERIAL`, `WBS`, `JUMLAH DIMINTA`, `ESTIMASI HARGA (RP)`, `SUBTOTAL (RP)`, `AKSI / STATUS`.
  - Added formatted WBS badge per item row.
  - Sorted `items` within each ticket ascending by WBS.
  - Sorted `activePendingRequisitions` and `filteredRequisitions` ascending by WBS.
- Expanded Automated Test Suites:
  - Created `src/utils/__tests__/wbsSort.test.ts` (7 tests).
  - Expanded `src/components/__tests__/RecentMaterialIssues.test.tsx` (10 tests, added header check and multi-row ascending sorting verification).
  - Created `src/components/__tests__/RequisitionApprovalWbsSort.test.tsx` (3 tests verifying header, item badges, within-ticket item sorting, and multi-ticket sorting).
- Quality Verification:
  - Vitest: All 57 test files passed, 366 tests passed (0 failures).
  - TypeScript Compilation: `tsc --noEmit` and `tsc -b` completed with 0 errors.
  - Production Build: `npm run build` generated production bundle cleanly in 510ms.
- Applied Task 3 enhancements to `RecentMaterialIssues.tsx`:
  - Ensured `fetchIssues` normalizes `wbs_stage` and `wbs_category` across `inventory_transactions`, `material_issues`, `goods_issues`, and base fallback.
  - Implemented `filteredRecentIssues` and `sortedIssues` memo with primary ascending WBS weight sort and secondary newest-first timestamp sort.
  - Reordered table header to: `[checkbox]`, `WBS`, `TIME`, `SPK NO.`, `MATERIAL`, `QTY`, `HARGA (RP)`, `EKSEKUTOR / AUDIT`, `AKSI`.
  - Reordered body cells so WBS is in column 2 styled with `bg-slate-800 text-slate-300 border border-slate-700`.
  - Added test in `RecentMaterialIssues.test.tsx` verifying exact header order, cell styling, and secondary timestamp sort (all 11 tests pass).
  - All 57 test files (367 tests) pass, production build succeeds cleanly in ~489ms.
