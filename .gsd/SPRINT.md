# Sprint 45 — Enforce Strict item_type = 'MATERIAL' Filter on Requisition RAB Allocation Panel

> **Duration**: 2026-10-19 to 2026-10-19
> **Status**: Completed ✅

## Goal
Enforce strict `item_type = 'MATERIAL'` filtering on the RAB allocation panel ("Alokasi RAB (WBS Terkait)") in the Mandor Material Requisition modal (`MaterialRequisitionForm.tsx`), strictly excluding labor services (`LABOR`, e.g. `TUKANG RANGKA BAK`), overhead items (`OVERHEAD`, e.g. `Listrik`), and legacy unclassified items (`null`), ensuring header counter badges and transfer actions reflect pure physical materials exclusively.

## Scope

### Included
- **Supabase Query & Client Filter in `MaterialRequisitionForm.tsx`**:
  - Replaced `.or('item_type.eq.MATERIAL,item_type.is.null')` with `.eq('item_type', 'MATERIAL')`.
  - Enforced strict client-side predicate: `(item.item_type || '').toUpperCase() === 'MATERIAL'` and strictly rejected `LABOR`, `OVERHEAD`, `null`, and undefined.
  - Added defense-in-depth check in approved Change Order item mapping: `(item.item_type || '').toUpperCase() === 'MATERIAL'`.
  - Excluded `OVERHEAD` items from WBS material/borongan allocation counter in `WbsChecklist.tsx`.
- **Availability Counter Badge & UI Feedback**:
  - Verified the counter badge beside "Alokasi RAB (WBS Terkait)" strictly counts pure material items.
  - Verified transfer mechanics (`<<`, `>>`, and double-click) synchronize the counter and empty state correctly.
- **Unit & Component Testing**:
  - Updated `src/components/__tests__/MaterialRequisitionForm.test.tsx` (5/5 tests passing).
  - Explicitly tested exclusion of `TUKANG RANGKA BAK` (0.3 pcs, Rp 300.000, `item_type: 'LABOR'`), unclassified `null` items, and `OVERHEAD` items.
  - Validated client-side fallback defense when database query returns unfiltered records.
- **Validation & Hygiene**:
  - Full test suite: 20/20 test suites passing, 147/147 tests passing (100%).
  - Linter: 0 warnings, 0 errors across 136 files (Oxlint).
  - TypeScript: Clean static compilation (`npx tsc -b`).
  - Production build: Clean build in 2.09s (`npm run build`).

### Explicitly Excluded
- Database schema changes (PostgreSQL schema already supports `item_type` on `rab_items` and `change_order_items`).
- SPK Borongan or Overhead modals (already enforce `LABOR` and `OVERHEAD` filtering).

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Update Supabase query and client-side filter logic in `MaterialRequisitionForm.tsx` | Antigravity | ✅ Done | 0.2h |
| 2. Synchronize availability counter badges and transfer mechanics | Antigravity | ✅ Done | 0.1h |
| 3. Update and enhance unit tests in `MaterialRequisitionForm.test.tsx` | Antigravity | ✅ Done | 0.2h |
| 4. Validation (Vitest, Oxlint, Vite build) and Commit | Antigravity | ✅ Done | 0.2h |

## Daily Log

### 2026-10-19
- Initialized Sprint 45 to enforce strict `item_type = 'MATERIAL'` filtering on Mandor Requisition RAB allocation panel.
- Archived Sprint 44 to `.gsd/sprints/sprint-44-scan-codebase-for-hardcoded-static-mock-data.md`.
- Updated `src/components/MaterialRequisitionForm.tsx`:
  - Replaced `.or('item_type.eq.MATERIAL,item_type.is.null')` with `.eq('item_type', 'MATERIAL')`.
  - Updated client-side filter to strictly validate `(item.item_type || '').toUpperCase() === 'MATERIAL'` and reject `LABOR`, `OVERHEAD`, and `null` items.
  - Ensured mapped items explicitly maintain `item_type: 'MATERIAL'`.
  - Added filter in change order items: `(item.item_type || '').toUpperCase() === 'MATERIAL'`.
- Updated `src/components/WbsChecklist.tsx` to exclude `OVERHEAD` items from pending material allocations.
- Updated `src/components/__tests__/MaterialRequisitionForm.test.tsx`:
  - Tested strict filtering with sample items including `TUKANG RANGKA BAK` (`LABOR`), `Tukang Borongan Tanpa Tipe` (`null`), `Listrik` (`OVERHEAD`), and multiple valid materials.
  - Tested double-click transfer, `<<` / `>>` button transfer, requisition submission, and client-side defense.
  - 5/5 tests passing in `MaterialRequisitionForm.test.tsx`.
- Ran full test suite: 20/20 test suites, 147/147 tests passed (100%).
- Ran Oxlint: 0 errors, 0 warnings.
- Ran TypeScript check: `tsc -b` clean.
- Ran Vite production build: build succeeded in 2.09s.
