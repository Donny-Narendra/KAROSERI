# Sprint 1 — Fix Item Transfer Isolation in Mandor Material Requisition Modal

> **Duration**: 2026-10-15 to 2026-10-15
> **Status**: In Progress

## Goal
Fix single-item transfer isolation and return logic in Mandor Material Requisition modal so double-click and transfer buttons (`<<` / `>>`) move only the selected item without clearing the remaining available RAB allocation items.

## Scope

### Included
- Fix single item transfer logic (`<<` and double-click) in `MaterialRequisitionForm.tsx` to isolate transferred items strictly by ID (`item.id` / `sourceRabId`).
- Fix transfer back logic (`>>`, double-click, and trash icon) in `MaterialRequisitionForm.tsx` to return items back to `availableItems` if originated from RAB allocations.
- Remove overzealous text/word-overlap and shared-material filtering from local dual-list state in `MaterialRequisitionForm.tsx` and `src/utils/rabItemAllocation.ts`.
- Ensure badge counter for "Alokasi RAB (WBS Terkait)" reflects the exact remaining count (e.g. from 2 to 1).
- Ensure empty-state "Semua material telah dipindahkan" appears only when available RAB items count is strictly 0.
- Verify TypeScript build and linting pass with 0 errors.

### Explicitly Excluded
- Database schema changes (no Supabase migrations needed).
- Automatic git commits or pushes.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| Refactor dual-list state management in `MaterialRequisitionForm.tsx` with dedicated `availableItems` state & strict ID isolation | Antigravity | ✅ Done | 1h |
| Fix return transfer handlers (`>>`, double-click, trash) to restore RAB items correctly | Antigravity | ✅ Done | 0.5h |
| Clean up over-matching in `src/utils/rabItemAllocation.ts` for local/requisition comparisons | Antigravity | ✅ Done | 0.5h |
| Verify counter badge, empty-state conditions, and compile check (`npm run build`) | Antigravity | ✅ Done | 0.5h |

## Daily Log

### 2026-10-15
- Sprint created based on user problem report on Mandor Material Requisition modal.
- Root cause identified: over-matching word overlap and cross-item filtering in dual-list state / `isRabItemAllocated`.
- Implemented dedicated `availableItems` state in `MaterialRequisitionForm.tsx` with strict ID filtering (`prev.filter(item => item.id !== sourceItem.id)`).
- Implemented `handleReturnItem` and updated `handleExecuteRemove` to return RAB items back to `availableItems` when transferred back (`>>`, double-click, or trash icon).
- Fixed `src/utils/rabItemAllocation.ts` to eliminate false-positive substring & word-overlap matching between similar material names.
- Fixed React Hook initialization lint warning in `MaterialRequisitionForm.tsx` using `useCallback`.
- Verified TypeScript build (`tsc -b && vite build`) passes with 0 errors and `oxlint` reports 0 errors.
