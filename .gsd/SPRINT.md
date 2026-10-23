# Sprint 85 — Fix False Shared Exclusion of RAB and Change Order Labor Items in SPK Borongan Modal

> **Duration**: 2026-10-24 to 2026-10-24
> **Status**: In Progress

## Goal
Fix false shared exclusion of RAB and Change Order labor items sharing identical names in the SPK Borongan modal (`SpkBoronganPanel.tsx`), ensuring availability filtering isolates items strictly by unique database row ID (`rab_item_id` and `change_order_item_id`) rather than text description matching.

## Scope

### Included
- **Task 1: Database Migration for Source ID Tracking**
  - Verify and guarantee `rab_item_id` and `change_order_item_id` foreign key columns in `spk_borongan` via idempotent migration `supabase/migrations/20261024030000_add_source_ids_to_spk_borongan.sql`.
- **Task 2: Assignment Handler & Guide Panel ID-Based Exclusion in `SpkBoronganPanel.tsx`**
  - Store selected item source metadata (`id`, `isChangeOrder`, `name`, `rate`) upon clicking `<<`.
  - Persist explicit `rab_item_id` (null if Change Order) and `change_order_item_id` (null if RAB) upon submission.
  - Refactor guide panel filtering (`availableLaborItems` / `filteredMaterials`) to exclude items exclusively using unique entity ID sets (`assignedRabItemIds` and `assignedCoItemIds`), preventing identically named items from different origins from mutually wiping each other out.
  - Provide `src/components/mandor/SpkBoronganModal.tsx` export wrapper to align naming with `/mandor` architecture.
  - Update `src/utils/rabItemAllocation.ts` to respect explicit source IDs and prevent false cross-origin text matches for SPK Borongan assignments.
- **Task 3: Automated Testing & Verification**
  - Unit tests in `src/utils/__tests__/rabItemAllocation.test.ts` for isolated origin matching.
  - Component tests in `src/components/__tests__/SpkBoronganPanel.test.tsx` verifying:
    1. Both identically named items (RAB @ Rp 100.000 and CO @ Rp 248.964) render together (2 Tersedia).
    2. Assigning the CO item excludes only the CO item; the RAB item remains available (1 Tersedia).
    3. Assigning the remaining RAB item results in 0 Tersedia.
    4. Cancelling an assignment restores only the cancelled item.
  - Static type check (`tsc -b`) and build verification (`npm run build`).

### Explicitly Excluded
- Modifying Material Requisitions or Warehouse issue flows.
- Modifying cashflow / billing calculator logic.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Create migration `20261024030000_add_source_ids_to_spk_borongan.sql` | Antigravity | 🔄 In Progress | 0.25h |
| 2. Implement ID-based exclusion in `SpkBoronganPanel.tsx`, `src/components/mandor/SpkBoronganModal.tsx`, and `rabItemAllocation.ts` | Antigravity | ⬜ Todo | 0.75h |
| 3. Add automated tests and verify quality gates (`npm test`, `tsc`, `npm run build`) | Antigravity | ⬜ Todo | 0.5h |

## Daily Log

### 2026-10-24
- Initialized Sprint 85.
- Archived Sprint 84 to `.gsd/sprints/sprint-84-display-itemized-labor-and-overhead-margins-on-change-order-cards.md`.
- Baseline verification: 61 test files, 445 tests passed.
