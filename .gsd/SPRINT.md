# Sprint 45 — Enforce Strict item_type = 'MATERIAL' Filter on Requisition RAB Allocation Panel

> **Duration**: 2026-10-19 to 2026-10-19
> **Status**: In Progress

## Goal
Enforce strict `item_type = 'MATERIAL'` filtering on the RAB allocation panel ("Alokasi RAB (WBS Terkait)") in the Mandor Material Requisition modal (`MaterialRequisitionForm.tsx`), strictly excluding labor services (`LABOR`), overhead items (`OVERHEAD`), and legacy unclassified items (`null`), ensuring header counter badges and transfer actions reflect pure physical materials exclusively.

## Scope

### Included
- **Supabase Query & Client Filter in `MaterialRequisitionForm.tsx`**:
  - Replace `.or('item_type.eq.MATERIAL,item_type.is.null')` with `.eq('item_type', 'MATERIAL')`.
  - Update client-side filtering predicate to strictly require `item.item_type === 'MATERIAL'`, rejecting `null`, `undefined`, `LABOR`, and `OVERHEAD`.
  - Ensure `item_type: 'MATERIAL'` is assigned consistently across all mapped source items.
- **Availability Counter Badge & UI Feedback**:
  - Verify the counter badge next to "Alokasi RAB (WBS Terkait)" strictly counts pure material items.
  - Verify empty state and footer messages accurately reflect material availability.
- **Unit & Component Testing**:
  - Update `src/components/__tests__/MaterialRequisitionForm.test.tsx` to verify strict rejection of `null` legacy items alongside `LABOR` and `OVERHEAD`.
  - Validate that only items with explicit `item_type === 'MATERIAL'` are displayed and transferable.
- **Validation & Hygiene**:
  - Full test suite passing (`npm test`).
  - Linter clean (`npx oxlint`).
  - Production build clean (`npm run build`).

### Explicitly Excluded
- Database schema changes (schema already supports `item_type` on `rab_items` and `change_order_items`).
- SPK Borongan or Overhead modals (already enforce `LABOR` and `OVERHEAD` filtering).

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Update Supabase query and client-side filter logic in `MaterialRequisitionForm.tsx` | Antigravity | ⏳ In Progress | 0.2h |
| 2. Synchronize availability counter badges and transfer mechanics | Antigravity | ⬜ Todo | 0.1h |
| 3. Update and enhance unit tests in `MaterialRequisitionForm.test.tsx` | Antigravity | ⬜ Todo | 0.2h |
| 4. Validation (Vitest, Oxlint, Vite build) and Commit | Antigravity | ⬜ Todo | 0.2h |

## Daily Log

### 2026-10-19
- Initialized Sprint 45 to enforce strict `item_type = 'MATERIAL'` filtering on Mandor Requisition RAB allocation panel.
- Archived Sprint 44 to `.gsd/sprints/sprint-44-scan-codebase-for-hardcoded-static-mock-data.md`.
