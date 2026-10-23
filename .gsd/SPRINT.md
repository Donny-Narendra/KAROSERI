# Sprint 85 — Fix False Shared Exclusion of RAB and Change Order Labor Items in SPK Borongan Modal

> **Duration**: 2026-10-24 to 2026-10-24
> **Status**: Completed

## Goal
Fix false shared exclusion of RAB and Change Order labor items sharing identical names in the SPK Borongan modal (`SpkBoronganPanel.tsx`), ensuring availability filtering isolates items strictly by unique database row ID (`rab_item_id` and `change_order_item_id`) rather than text description matching.

## Scope

### Included
- **Task 1: Database Migration for Source ID Tracking**
  - Verified and guaranteed `rab_item_id` and `change_order_item_id` foreign key columns in `spk_borongan` via idempotent migration `supabase/migrations/20261024030000_add_source_ids_to_spk_borongan.sql`.
- **Task 2: Assignment Handler & Guide Panel ID-Based Exclusion in `SpkBoronganPanel.tsx`**
  - Stored selected item source metadata (`id`, `isChangeOrder`, `name`, `rate`) upon clicking `<<` via `handleSelectLaborItem`.
  - Persisted explicit `rab_item_id` (null if Change Order) and `change_order_item_id` (null if RAB) upon submission in `handleCreate`.
  - Refactored guide panel filtering (`availableLaborItems` / `filteredMaterials`) to exclude items exclusively using unique entity ID sets (`assignedRabItemIds` and `assignedCoItemIds`), preventing identically named items from different origins from mutually wiping each other out.
  - Provided `src/components/mandor/SpkBoronganModal.tsx` export wrapper to align naming with `/mandor` architecture.
  - Updated `src/utils/rabItemAllocation.ts` to respect explicit source IDs and prevent false cross-origin text matches for SPK Borongan assignments.
- **Task 3: Automated Testing & Verification**
  - Added unit tests in `src/utils/__tests__/rabItemAllocation.test.ts` for isolated origin matching.
  - Added component tests in `src/components/__tests__/SpkBoronganPanel.test.tsx` verifying:
    1. Both identically named items (RAB @ Rp 100.000 and CO @ Rp 248.964) render together (2 Tersedia).
    2. Assigning the CO item excludes only the CO item; the RAB item remains available (1 Tersedia).
    3. Assigning the remaining RAB item results in 0 Tersedia.
    4. Cancelling an assignment restores only the cancelled item.
  - Static type check (`tsc -b`), full Vitest suite (61 suites, 449 tests passing, 100% green), linter check (`npx oxlint` 0 errors), and production build (`npm run build`).

### Explicitly Excluded
- Modifying Material Requisitions or Warehouse issue flows.
- Modifying cashflow / billing calculator logic.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Create migration `20261024030000_add_source_ids_to_spk_borongan.sql` | Antigravity | ✅ Completed | 0.25h |
| 2. Implement ID-based exclusion in `SpkBoronganPanel.tsx`, `src/components/mandor/SpkBoronganModal.tsx`, and `rabItemAllocation.ts` | Antigravity | ✅ Completed | 0.75h |
| 3. Add automated tests and verify quality gates (`npm test`, `tsc`, `npm run build`) | Antigravity | ✅ Completed | 0.5h |

## Daily Log

### 2026-10-24
- Initialized Sprint 85.
- Archived Sprint 84 to `.gsd/sprints/sprint-84-display-itemized-labor-and-overhead-margins-on-change-order-cards.md`.
- Baseline verification: 61 test files, 445 tests passed.
- Implemented Task 1:
  - Created idempotent migration `supabase/migrations/20261024030000_add_source_ids_to_spk_borongan.sql` for `rab_item_id` and `change_order_item_id` with foreign keys and indexes.
- Implemented Task 2:
  - Updated `src/utils/rabItemAllocation.ts` `isRabItemAllocated` to isolate matches by `change_order_item_id` and `rab_item_id`, preventing false cross-contamination between origins with identical text names.
  - Updated `src/components/SpkBoronganPanel.tsx`:
    - Added `selectedSourceItem` and `allLaborSources` state.
    - Updated `handleSelectLaborItem` to store source metadata (`id`, `isChangeOrder`, `name`, `rate`).
    - Updated `handleCreate` to record `rab_item_id` or `change_order_item_id` directly from selected source item.
    - Computed `availableLaborItems` via `useMemo` using ID sets (`assignedRabItemIds` and `assignedCoItemIds`), isolating availability strictly by database ID.
  - Created `src/components/mandor/SpkBoronganModal.tsx` wrapper.
- Implemented Task 3:
  - Added unit tests in `src/utils/__tests__/rabItemAllocation.test.ts`.
  - Added comprehensive component tests in `src/components/__tests__/SpkBoronganPanel.test.tsx`.
  - Validated type safety (`tsc -b`: 0 errors), linter check (`npx oxlint`: 0 errors), Vitest suite (61 test files, 449 tests passing), and production bundle (`npm run build`: built in 826ms).
