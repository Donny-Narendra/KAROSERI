# Sprint 47 — Dynamic RAB-Driven Presets for Floor Overhead Terminal in Mandor Portal

> **Duration**: 2026-10-19 to 2026-10-19
> **Status**: In Progress

## Goal
Dynamically populate Mandor portal's Floor Overhead Terminal presets directly from RAB items (`item_type = 'OVERHEAD'`) allocated to the active WBS stage, enable single-click form auto-fill with remaining budget quantity, bind `rab_item_id` to `spk_overhead_logs`, provide fallback to general warehouse presets when unbudgeted, and decrement WBS pending allocation counter upon logging.

## Scope

### Included
- **Database Schema Migration**:
  - Add `rab_item_id UUID REFERENCES public.rab_items(id) ON DELETE SET NULL` to `public.spk_overhead_logs`.
  - Add index `idx_spk_overhead_logs_rab_item_id` for efficient query joins.
- **TypeScript Data Contracts & Service Layer**:
  - Update `SpkOverheadLog` and `CreateSpkOverheadLogPayload` in `src/types/financialReports.ts` to include `rab_item_id?: string | null`.
  - Update `createSpkOverheadLog` in `src/services/financialReportsService.ts` to persist `rab_item_id`.
- **Mandor Overhead Terminal Modal (`SpkOverheadModal.tsx`)**:
  - Fetch RAB overhead items (`item_type = 'OVERHEAD'`) for the active `spkId` and stage.
  - Calculate accumulated usage per RAB overhead item vs pagu quantity (`remainingQty = quantity - loggedQty`).
  - Render dynamic preset cards: specific RAB name, pagu quantity & unit price, remaining unrecorded balance.
  - Auto-fill form inputs (`overheadName`, `ratePerUnit`, `frequencyQty` with remaining budget, `rab_item_id`).
  - Provide fallback button "Tampilkan Master Preset Gudang (Umum)" for unbudgeted overhead.
  - Highlight selected preset and support switching stages.
- **WBS Allocation Synchronization (`WbsChecklist.tsx`, `rabItemAllocation.ts`, `WbsPendingMaterialModal.tsx`)**:
  - Include `item_type` in `rab_items` query within `fetchMaterialAllocations`.
  - Fetch `spk_overhead_logs` in `fetchMaterialAllocations` and feed into allocation checks so logged overhead decrements the pending badge.
  - Call `fetchMaterialAllocations` in `onOverheadUpdated`.
  - Add "Overhead FOH" button to `WbsPendingMaterialModal`.
- **Testing & Verification**:
  - Update and extend `SpkOverheadModal.test.tsx` with dynamic RAB preset suites.
  - Verify SPK-2668 data, unit tests (Vitest), linter (Oxlint), and production build.

### Explicitly Excluded
- Modifying SPK borongan or material requisition core workflow.
- Changing financial database view calculation logic.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Database migration: Add `rab_item_id` to `spk_overhead_logs` & update types/services | Antigravity | ⏳ In Progress | 0.2h |
| 2. Implement dynamic RAB presets and fallback in `SpkOverheadModal.tsx` | Antigravity | ⬜ Todo | 0.4h |
| 3. Synchronize WBS pending allocation counter and overhead logging in `WbsChecklist.tsx` & `rabItemAllocation.ts` | Antigravity | ⬜ Todo | 0.3h |
| 4. Update unit tests, verify SPK-2668 end-to-end, and run quality checks | Antigravity | ⬜ Todo | 0.3h |

## Daily Log

### 2026-10-19
- Initialized Sprint 47: Dynamic RAB-Driven Presets for Floor Overhead Terminal in Mandor Portal.
- Archived Sprint 46 to `.gsd/sprints/sprint-46-propagate-item-type-from-inventory-assembly-packages-to-rab-and-fix-corrupted-active-spk-items.md`.
- Inspected database schema: confirmed `spk_overhead_logs` requires `rab_item_id` column.
- Inspected SPK-2668: verified WBS 1 (Pembongkaran) has 2 overhead items (`LISTRIK` and `sewa kompressor`), and verified current static presets and pending badge.
