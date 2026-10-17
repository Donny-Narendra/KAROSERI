# Sprint 34 — Filter Material Requisition RAB Reference to Exclusively Show MATERIAL Items

> **Duration**: 2026-10-17 to 2026-10-17
> **Status**: Completed ✅

## Goal
Filter the RAB reference panel ("Alokasi RAB (WBS Terkait)") in the Mandor Material Requisition modal (`MaterialRequisitionForm.tsx`) to strictly and exclusively display items where `item_type = 'MATERIAL'` (or `item_type IS NULL` for legacy unclassified data), preventing labor services (e.g., `LABOR`) and overhead entries (e.g., `OVERHEAD` / `Listrik`) from appearing in the material requisition reference list, while ensuring accurate count badges and valid transfer actions (`<<` / double-click).

## Scope

### Included
- **Supabase Query & Client Filter in `MaterialRequisitionForm.tsx`**:
  - Add `.or('item_type.eq.MATERIAL,item_type.is.null')` to Supabase `rab_items` query.
  - Include `item_type` in the `.select(...)` query of `rab_items`.
  - Add strict client-side checks in filtering: ensure item is MATERIAL or null legacy, and strictly NOT `LABOR` and NOT `OVERHEAD`.
- **Interface & Payload Verification**:
  - Update `RabSourceItem` and `RequisitionItem` interfaces to include `item_type?: string`.
  - Ensure transferring items (`<<` or double click) preserves physical material data (`material_id`, `unit_price`, `quantity`, `unit`, `item_type`).
- **Header Badge & Count Verification**:
  - Ensure the count badge beside `Alokasi RAB (WBS Terkait)` strictly reflects the filtered physical material items.
  - Verify empty state and footer counters display proper material counts.
- **Unit Testing & Empirical Verification**:
  - Create comprehensive unit tests in `src/components/__tests__/MaterialRequisitionForm.test.tsx` verifying MATERIAL filtering, exclusion of LABOR and OVERHEAD, count badges, and transfer functionality.
  - Run full test suite (`npm test`), linter (`npx oxlint`), and production build (`npm run build`).

### Explicitly Excluded
- Database schema changes or migrations.
- Modifications to warehouse Goods Issue or Requisition Approval logic.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Update Supabase query and client-side filter in `MaterialRequisitionForm.tsx` to require `item_type === 'MATERIAL'` (or null legacy) and exclude `LABOR` / `OVERHEAD` | Antigravity | ✅ Done | 0.2h |
| 2. Verify count badge and transfer mechanics (`<<` & double click) for material items | Antigravity | ✅ Done | 0.2h |
| 3. Create comprehensive unit tests in `src/components/__tests__/MaterialRequisitionForm.test.tsx` | Antigravity | ✅ Done | 0.3h |
| 4. Validation (Vitest, Oxlint, Vite build) and Commit | Antigravity | ✅ Done | 0.2h |

## Daily Log

### 2026-10-17
- Initialized Sprint 34: Filter Material Requisition RAB Reference to Exclusively Show MATERIAL Items.
- Archived Sprint 33 to `.gsd/sprints/sprint-33-filter-spk-borongan-rab-reference-to-exclusively-show-labor-items.md`.
- Updated `RabSourceItem` and `RequisitionItem` interfaces in `src/components/MaterialRequisitionForm.tsx` with `item_type?: string | null`.
- Added `.or('item_type.eq.MATERIAL,item_type.is.null')` to Supabase query for `rab_items` and included `item_type` in `.select(...)`.
- Enforced strict predicate filtering (`isMaterialType && isNotLabor && isNotOverhead`) in client-side mapping.
- Preserved `item_type` on item transfer (`handleMoveToRequisition`).
- Created unit tests in `src/components/__tests__/MaterialRequisitionForm.test.tsx` (5/5 tests passing).
- Executed full test suite (15/15 test files, 120/120 tests passing), linter (0 errors), and production build (`npm run build` succeeded).
- Prepared commit `fix(mandor): filter requisition rab reference list to strictly require item_type = 'MATERIAL'`.
