# Sprint 74 — Add WBS Column and Ascending WBS Sorting to Mandor Requests and Recent Material Issues Tables

> **Duration**: 2026-10-22 to 2026-10-23
> **Status**: In Progress

## Goal
Add WBS stage information column and enforce ascending WBS sorting (WBS 1 Pembongkaran -> WBS 2 Sasis/Rangka -> WBS 3 Dinding/Fabrikasi -> WBS 4 Pengecatan -> WBS 5 Kelistrikan/Hidrolik) across both "Pending Requisitions (Mandor)" and "Recent Material Issues" tables in `/warehouse` and `/service-advisor` dashboards.

## Scope

### Included
- Create `src/utils/wbsSort.ts` utility providing `getWbsOrderWeight`, `formatWbsBadge`, `getWbsBadgeColor`, and sorting comparator helpers.
- Update `RecentMaterialIssues.tsx`:
  - Enhance queries to select `material_requisitions:requisition_id(id, wbs_category)` and `material_requisition_items:requisition_item_id(id, wbs_stage)`, plus `wbs_stage` in fallback queries (`material_issues`).
  - Extract WBS stage per issue row (`issue.wbs_stage || issue.material_requisition_items?.wbs_stage || issue.material_requisitions?.wbs_category || '-'`).
  - Add `WBS` column to table header and render formatted badge in each row.
  - Sort displayed issues ascending by WBS order weight (WBS 1 -> WBS 2 -> WBS 3 -> WBS 4 -> WBS 5).
- Update `RequisitionApproval.tsx`:
  - Update table header in "Pending Requisitions (Mandor)" to include `WBS` column (`MATERIAL`, `WBS`, `JUMLAH DIMINTA`, `ESTIMASI HARGA (RP)`, `SUBTOTAL (RP)`, `AKSI / STATUS`).
  - Render formatted WBS badge per item row.
  - Sort material requisition items within each ticket in ascending WBS order.
  - Sort parent requisitions by WBS order ascending.
- Update and add comprehensive unit and integration tests in `wbsSort.test.ts`, `RecentMaterialIssues.test.tsx`, and `RequisitionApproval` tests.

### Explicitly Excluded
- Database schema alterations or database migrations.
- Altering business logic for Gate 2 budget validations or SPK stage transitions.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Create WBS normalization, badge & sorting helper in `src/utils/wbsSort.ts` | Antigravity | ⏳ In Progress | 0.5h |
| 2. Add WBS column & ascending sort to `RecentMaterialIssues.tsx` | Antigravity | ⬜ Todo | 1h |
| 3. Add WBS column & ascending sort to `RequisitionApproval.tsx` | Antigravity | ⬜ Todo | 1h |
| 4. Write unit & integration tests (`wbsSort.test.ts`, `RecentMaterialIssues.test.tsx`, `RequisitionApproval`) | Antigravity | ⬜ Todo | 0.5h |
| 5. Quality verification (Vitest, Oxlint, TypeScript compilation, Build) | Antigravity | ⬜ Todo | 0.5h |

## Daily Log

### 2026-10-22
- Sprint 74 initialized.
- Archived Sprint 73 into `.gsd/sprints/sprint-73-fix-empty-recent-material-issues-table-in-warehouse-and-service-advisor.md`.
- Verified live database schema: `material_requisitions` contains `wbs_category`, `material_requisition_items` contains `wbs_stage`, and `inventory_transactions` connects via `requisition_id` and `requisition_item_id`. `material_issues` view already projects `wbs_stage`.
