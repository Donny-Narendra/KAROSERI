# Sprint 39 — Change Order 3-Element Costing (Overhead Support in Amendments)

> **Duration**: 2026-10-18 to 2026-10-18
> **Status**: Completed ✅

## Goal
Enable 3-element Job Order Costing (Material, Labor, and Factory Overhead) in Change Orders / Amendments:
1. Expand TypeScript contract `ChangeOrderItemType` to `'MATERIAL' | 'LABOR' | 'OVERHEAD'`.
2. Update `spkService.createChangeOrder` to accept `'OVERHEAD'` item type.
3. Enhance `AmendmentManager.tsx` with a dedicated `+ Item Overhead (FOH)` action, activity description input, purple badge styling, and overhead summary count.
4. Create a dedicated test suite `AmendmentManager.test.tsx` verifying overhead change order creation and subtotal calculations.

## Scope

### Included
- **TypeScript Types & Services**:
  - `src/types/database.ts`: `ChangeOrderItemType = 'MATERIAL' | 'LABOR' | 'OVERHEAD'`.
  - `src/services/spkService.ts`: `createChangeOrder` items payload type using `ChangeOrderItemType`.
- **UI Components (`src/components/AmendmentManager.tsx`)**:
  - Added `+ Item Overhead (FOH)` button with `Clock` icon and purple styling.
  - Implemented form handling for `OVERHEAD` items (default unit `'hari'`, clear `material_id`).
  - Rendered overhead activity description input (e.g. "Sewa Ruang Oven Lembur").
  - Updated draft summary box to include `overheadCount` alongside material and labor counts.
  - Styled `OVERHEAD` badge across draft cards and expandable detail table (`bg-purple-500/10 text-purple-400 border-purple-500/20`).
- **Testing & Verification**:
  - Created `src/components/__tests__/AmendmentManager.test.tsx` covering list view rendering, form display, overhead creation, live margins calculation, and submission payload.
  - Ran full test suite (17 test files, 133 tests passing 100%).
  - Verified clean TypeScript build (`tsc -b`) and Vite production bundle (`npm run build` in 516ms).

### Explicitly Excluded
- Mandor operational actual overhead logging UI (scheduled for Sprint 40).
- Oxlint code hygiene cleanup (scheduled for Sprint 41).

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Update TypeScript contract in `src/types/database.ts` and `src/services/spkService.ts` | Antigravity | ✅ Done | 0.2h |
| 2. Implement Overhead item entry and badge styling in `src/components/AmendmentManager.tsx` | Antigravity | ✅ Done | 0.3h |
| 3. Create unit test suite `src/components/__tests__/AmendmentManager.test.tsx` | Antigravity | ✅ Done | 0.3h |
| 4. Verify with full test suite, `tsc -b`, and production build | Antigravity | ✅ Done | 0.2h |

## Daily Log

### 2026-10-18
- Initialized Sprint 39: Change Order 3-Element Costing (Overhead Support in Amendments).
- Verified `view_wbs_cost_variance` already supports `co_overhead_budget` via `COALESCE(SUM(CASE WHEN item_type = 'OVERHEAD' ...))`.
- Updated `ChangeOrderItemType` in `src/types/database.ts` and `src/services/spkService.ts`.
- Enhanced `AmendmentManager.tsx`:
  - Added `+ Item Overhead (FOH)` button with purple styling.
  - Handled item type switching: resets `material_id = null` and sets `unit = 'hari'`.
  - Added label `Uraian Biaya Overhead (FOH) *` and placeholder.
  - Updated draft summary box with `overheadCount`.
  - Applied purple badge in draft line item cards and expandable detail table.
- Created unit test suite `src/components/__tests__/AmendmentManager.test.tsx` (3 tests passing).
- Ran all 17 test suites: 133 tests passed (100%).
- Ran `tsc -b` and `npm run build`: cleanly built in 516ms.
