# Sprint 47 — Dynamic RAB-Driven Presets for Floor Overhead Terminal in Mandor Portal

> **Duration**: 2026-10-19 to 2026-10-19
> **Status**: Completed ✅

## Goal
Dynamically populate Mandor portal's Floor Overhead Terminal presets directly from RAB items (`item_type = 'OVERHEAD'`) allocated to the active WBS stage, enable single-click form auto-fill with remaining budget quantity, bind `rab_item_id` to `spk_overhead_logs`, provide fallback to general warehouse presets when unbudgeted, and decrement WBS pending allocation counter upon logging.

## Scope

### Included
- **Database Schema Migration**:
  - Created and applied `supabase/migrations/20261019020000_add_rab_item_id_to_spk_overhead_logs.sql`.
  - Added `rab_item_id UUID REFERENCES public.rab_items(id) ON DELETE SET NULL` to `public.spk_overhead_logs`.
  - Added index `idx_spk_overhead_logs_rab_item_id` for efficient query joins.
- **TypeScript Data Contracts & Service Layer**:
  - Updated `SpkOverheadLog` and `CreateSpkOverheadLogPayload` in `src/types/financialReports.ts` to include `rab_item_id?: string | null`.
  - Updated `createSpkOverheadLog` in `src/services/financialReportsService.ts` to persist `rab_item_id`.
- **Mandor Overhead Terminal Modal (`SpkOverheadModal.tsx`)**:
  - Fetched RAB overhead items (`item_type = 'OVERHEAD'`) for the active `spkId` and stage.
  - Calculated accumulated usage per RAB overhead item vs pagu quantity (`remainingQty = quantity - loggedQty`).
  - Rendered dynamic preset cards with specific RAB name, pagu quantity & unit price, remaining unrecorded balance.
  - Auto-filled form inputs (`overheadName`, `ratePerUnit`, `frequencyQty` with remaining budget, `rab_item_id`).
  - Provided fallback button "Tampilkan Master Preset Gudang (Umum)" for unbudgeted overhead.
  - Highlighted selected preset and supported switching stages dynamically.
- **WBS Allocation Synchronization (`WbsChecklist.tsx`, `rabItemAllocation.ts`, `WbsPendingMaterialModal.tsx`)**:
  - Included `item_type` in `rab_items` query within `fetchMaterialAllocations`.
  - Fetched `spk_overhead_logs` in `fetchMaterialAllocations` and fed into allocation checks so logged overhead decrements the pending badge.
  - Called `fetchMaterialAllocations` in `onOverheadUpdated`.
  - Added "Overhead FOH" button to `WbsPendingMaterialModal` for direct navigation.
- **Testing & Verification**:
  - Updated `SpkOverheadModal.test.tsx` (6/6 tests passing).
  - Created `src/utils/__tests__/rabItemAllocation.test.ts` (6/6 tests passing).
  - Empirically verified on SPK-2668: initial 4 pending items decrements to 3 upon logging LISTRIK, leaving only unlogged sewa kompressor.
  - Full test suite: 24/24 test suites passing, 167/167 tests passing (100%).
  - Linter: 0 warnings, 0 errors across 142 files (Oxlint).
  - TypeScript: Clean compilation (`npx tsc -b`).
  - Production build: Clean build in 597ms (`npm run build`).

### Explicitly Excluded
- Modifying SPK borongan or material requisition core workflow.
- Changing financial database view calculation logic.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Database migration: Add `rab_item_id` to `spk_overhead_logs` & update types/services | Antigravity | ✅ Done | 0.2h |
| 2. Implement dynamic RAB presets and fallback in `SpkOverheadModal.tsx` | Antigravity | ✅ Done | 0.4h |
| 3. Synchronize WBS pending allocation counter and overhead logging in `WbsChecklist.tsx` & `rabItemAllocation.ts` | Antigravity | ✅ Done | 0.3h |
| 4. Update unit tests, verify SPK-2668 end-to-end, and run quality checks | Antigravity | ✅ Done | 0.3h |

## Daily Log

### 2026-10-19
- Initialized Sprint 47: Dynamic RAB-Driven Presets for Floor Overhead Terminal in Mandor Portal.
- Archived Sprint 46 to `.gsd/sprints/sprint-46-propagate-item-type-from-inventory-assembly-packages-to-rab-and-fix-corrupted-active-spk-items.md`.
- Inspected database schema: confirmed `spk_overhead_logs` requires `rab_item_id` column.
- Inspected SPK-2668: verified WBS 1 (Pembongkaran) has 2 overhead items (`LISTRIK` and `sewa kompressor`), and verified current static presets and pending badge.
- Created and executed migration `supabase/migrations/20261019020000_add_rab_item_id_to_spk_overhead_logs.sql`: added `rab_item_id` with foreign key to `rab_items(id)` and created index.
- Updated `src/types/financialReports.ts` (`SpkOverheadLog`, `CreateSpkOverheadLogPayload`) and `src/services/financialReportsService.ts`.
- Refactored `src/components/SpkOverheadModal.tsx` to dynamically query and calculate active stage RAB overhead items, render cards with pagu/rate/remaining balance, auto-fill form and bind `rab_item_id`, and provide general preset fallback.
- Updated `src/utils/rabItemAllocation.ts` (`OverheadLogLike`, overhead checking in `isRabItemAllocated`) and `src/components/WbsChecklist.tsx` to query `spk_overhead_logs` and refresh allocations on overhead log updates.
- Added quick "Overhead FOH" navigation in `src/components/WbsPendingMaterialModal.tsx`.
- Created `src/utils/__tests__/rabItemAllocation.test.ts` (6 tests).
- Updated `src/components/__tests__/SpkOverheadModal.test.tsx` (6 tests).
- Empirically verified on PostgreSQL with SPK-2668: initial 4 pending items decrements to 3 when LISTRIK is logged.
- Full test suite: 24/24 passed, 167/167 tests passed.
- Oxlint: 0 errors, 0 warnings across 142 files.
- TypeScript static check and Vite production build passed cleanly.
