# Sprint 75 — Add Source Origin Column and Package Name with Ascending WBS Sorting in Warehouse Requisitions and Recent Issues

> **Duration**: 2026-10-22 to 2026-10-23
> **Status**: In Progress

## Goal
Add `SUMBER / PAKET` information column and enforce ascending WBS sorting (WBS 1 -> WBS 2 -> WBS 3 -> WBS 4 -> WBS 5) across both "Pending Requisitions (Mandor)" and "Recent Material Issues" tables in `/warehouse` and `/service-advisor` dashboards, accurately distinguishing whether items originate from initial "RAB", "Change Order" (Adendum), or specific "Paket Barang Jadi (Assembly List / BOM)" with explicit package names.

## Scope

### Included
- Create `src/utils/sourceOrigin.ts` utility providing `resolveItemSource` and `ItemSourceInfo` to normalize item source types ('RAB' | 'CHANGE_ORDER' | 'DIRECT' | 'PACKAGE') and extract specific package names.
- Update `RequisitionApproval.tsx`:
  - Enhance `material_requisitions` query to fetch package and change order details:
    - `rab_items ( id, item_total, quantity, description, notes, package_id, product_packages:package_id ( id, name ) )`
    - `change_order_items ( id, item_name, unit_price, quantity, notes, change_order_id )`
  - Add `SUMBER / PAKET` column to table header in "Pending Requisitions (Mandor)".
  - Render resolved source origin badge per material item row.
  - Maintain ascending WBS sort for items and tickets.
- Update `RecentMaterialIssues.tsx`:
  - Enhance `inventory_transactions` query to fetch source origin relations:
    - `material_requisition_items:requisition_item_id ( id, wbs_stage, rab_item_id, change_order_item_id, rab_items ( id, notes, package_id, product_packages:package_id ( id, name ) ), change_order_items ( id, notes, change_order_id ) )`
  - Add `SUMBER / PAKET` column to table header.
  - Render source origin badge in each row.
  - Maintain ascending WBS sort and secondary newest timestamp sort.
- Unit and integration tests in `sourceOrigin.test.ts`, `RequisitionApprovalWbsSort.test.tsx`, and `RecentMaterialIssues.test.tsx`.
- Quality verification (Vitest, Oxlint, TypeScript compilation, Build).

### Explicitly Excluded
- Database schema changes or migrations.
- Modifying approval execution logic or Gate 2 validation budgets.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Create source origin helper in `src/utils/sourceOrigin.ts` & unit tests | Antigravity | ⬜ Todo | 0.5h |
| 2. Add `SUMBER / PAKET` column & query joins to `RequisitionApproval.tsx` | Antigravity | ⬜ Todo | 1h |
| 3. Add `SUMBER / PAKET` column & query joins to `RecentMaterialIssues.tsx` | Antigravity | ⬜ Todo | 1h |
| 4. Update automated tests in `RequisitionApprovalWbsSort.test.tsx` & `RecentMaterialIssues.test.tsx` | Antigravity | ⬜ Todo | 0.5h |
| 5. Quality verification (Vitest, Oxlint, TypeScript compilation, Build) | Antigravity | ⬜ Todo | 0.5h |

## Daily Log

### 2026-10-22
- Sprint 75 initialized.
- Archived Sprint 74 into `.gsd/sprints/sprint-74-add-wbs-column-and-ascending-wbs-sorting-to-mandor-requests-and-recent-material-issues-tables.md`.
