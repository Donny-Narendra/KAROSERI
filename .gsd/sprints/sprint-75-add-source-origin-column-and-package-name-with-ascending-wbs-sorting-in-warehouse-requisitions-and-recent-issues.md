# Sprint 75 — Add Source Origin Column and Package Name with Ascending WBS Sorting in Warehouse Requisitions and Recent Issues

> **Duration**: 2026-10-22 to 2026-10-23
> **Status**: Completed

## Goal
Add `SUMBER / PAKET` information column and enforce ascending WBS sorting (WBS 1 -> WBS 2 -> WBS 3 -> WBS 4 -> WBS 5) across both "Pending Requisitions (Mandor)" and "Recent Material Issues" tables in `/warehouse` and `/service-advisor` dashboards, accurately distinguishing whether items originate from initial "RAB", "Change Order" (Adendum), or specific "Paket Barang Jadi (Assembly List / BOM)" with explicit package names.

## Scope

### Included
- Create `src/utils/sourceOrigin.ts` utility providing `resolveItemSource`, `extractIssueSource`, and `ItemSourceInfo` to normalize item source types ('RAB' | 'CHANGE_ORDER' | 'DIRECT' | 'PACKAGE') and extract specific package names.
- Update `RequisitionApproval.tsx`:
  - Enhance `material_requisitions` query to fetch package and change order details:
    - `rab_items ( id, item_total, quantity, description, notes, package_id, product_packages:package_id ( id, name ) )`
    - `change_order_items ( id, item_name, unit_price, quantity, notes, change_order_id )`
  - Add `SUMBER / PAKET` column to table header in "Pending Requisitions (Mandor)".
  - Render resolved source origin badge per material item row.
  - Maintain ascending WBS sort for items and tickets.
  - Align table `colSpan` to 7 in empty rows and footers.
- Update `RecentMaterialIssues.tsx`:
  - Enhance `inventory_transactions` query to fetch source origin relations:
    - `material_requisition_items:requisition_item_id ( id, wbs_stage, rab_item_id, change_order_item_id, rab_items ( id, notes, package_id, product_packages:package_id ( id, name ) ), change_order_items ( id, notes, change_order_id ) )`
  - Add `SUMBER / PAKET` column to table header between `MATERIAL` and `QTY`.
  - Render source origin badge in each row.
  - Update search filter to match on package name and source origin label.
  - Maintain ascending WBS sort and secondary newest timestamp sort.
  - Update `colSpan` to 10 for loading and empty state rows.
- Unit and integration tests in `sourceOrigin.test.ts`, `RequisitionApprovalWbsSort.test.tsx`, and `RecentMaterialIssues.test.tsx`.
- Quality verification (Vitest, Oxlint, TypeScript compilation, Build).

### Explicitly Excluded
- Database schema changes or migrations.
- Modifying approval execution logic or Gate 2 validation budgets.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Create source origin helper in `src/utils/sourceOrigin.ts` & unit tests | Antigravity | ✅ Done | 0.5h |
| 2. Add `SUMBER / PAKET` column & query joins to `RequisitionApproval.tsx` | Antigravity | ✅ Done | 1h |
| 3. Add `SUMBER / PAKET` column & query joins to `RecentMaterialIssues.tsx` | Antigravity | ✅ Done | 1h |
| 4. Update automated tests in `RequisitionApprovalWbsSort.test.tsx` & `RecentMaterialIssues.test.tsx` | Antigravity | ✅ Done | 0.5h |
| 5. Quality verification (Vitest, Oxlint, TypeScript compilation, Build) | Antigravity | ✅ Done | 0.5h |

## Daily Log

### 2026-10-22
- Sprint 75 initialized.
- Archived Sprint 74 into `.gsd/sprints/sprint-74-add-wbs-column-and-ascending-wbs-sorting-to-mandor-requests-and-recent-material-issues-tables.md`.
- Implemented `src/utils/sourceOrigin.ts`:
  - `cleanPackageName`: Strips `[Paket: ...]` or `Paket: ` wrappers and cleans whitespace.
  - `extractPackageFromNotes`: Regex matcher for `[Paket: <name>]`.
  - `resolveItemSource`: Resolves `PACKAGE` (orange badge `bg-orange-500/15 text-orange-400 border border-orange-500/30`), `CHANGE_ORDER` (purple badge `bg-purple-500/15 text-purple-400 border border-purple-500/30`), `DIRECT` (emerald badge `bg-emerald-500/15 text-emerald-400 border border-emerald-500/30`), and defaults to `RAB` (blue badge `bg-blue-500/15 text-blue-400 border border-blue-500/30`).
  - `extractIssueSource`: Unified extractor for physical issue transactions joining requisition item and parent requisition context.
- Implemented `RequisitionApproval.tsx`:
  - Expanded PostgREST join on `material_requisition_items` to fetch package metadata and notes from `rab_items` and `change_order_items`.
  - Added `SUMBER / PAKET` header column.
  - Rendered badge with `resolveItemSource(item, req)` per item row.
  - Adjusted table `colSpan` to 7.
- Implemented `RecentMaterialIssues.tsx`:
  - Expanded `inventory_transactions` join on `material_requisition_items:requisition_item_id` to include `rab_items` and `change_order_items` notes and package references.
  - Added `SUMBER / PAKET` column to table header (10 columns total).
  - Rendered source badge per row.
  - Enhanced search to filter reactively on source label and package name.
  - Adjusted `colSpan` to 10 for loading and empty state rows.
- Automated Test Suite:
  - Created `src/utils/__tests__/sourceOrigin.test.ts` (15 unit tests covering normalization, note extraction, package resolution, change orders, direct issues, and defaults).
  - Updated `src/components/__tests__/RequisitionApprovalWbsSort.test.tsx` (4 tests, verifying header contains `SUMBER / PAKET` and item rows render package, change order, and RAB badges).
  - Updated `src/components/__tests__/RecentMaterialIssues.test.tsx` (12 tests, verifying 10 header columns in order and row badge rendering).
- Quality Verification:
  - Vitest: All 58 test files passed, 384 tests passed (0 failures).
  - TypeScript compilation: `tsc --noEmit` and `tsc -b` completed with 0 errors.
  - Oxlint: 0 warnings, 0 errors across 199 files.
  - Production build: `npm run build` generated bundle cleanly in 512ms.
