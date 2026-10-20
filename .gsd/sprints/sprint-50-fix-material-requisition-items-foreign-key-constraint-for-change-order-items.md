# Sprint 50 — Fix material_requisition_items Foreign Key Constraint for Change Order Items

> **Duration**: 2026-10-20 to 2026-10-21
> **Status**: Completed ✅

## Goal
Resolve database foreign key violation (`material_requisition_items_rab_item_id_fkey`) when mandor requests materials derived from Change Orders in `/mandor` portal by making `rab_item_id` nullable, adding an optional foreign key `change_order_item_id` referencing `change_order_items(id)`, and differentiating RAB items vs Change Order items in frontend mapping and submit payloads.

## Scope

### Included
- **Database Migration (`supabase/migrations/20261020010000_fix_requisition_change_order_fk.sql`)**:
  - Ensure `rab_item_id` in `material_requisition_items` is nullable (`DROP NOT NULL`).
  - Add optional foreign key `change_order_item_id` referencing `public.change_order_items(id) ON DELETE SET NULL`.
  - Create index `idx_material_req_items_co_id` on `material_requisition_items(change_order_item_id)` for query optimization.
- **Frontend Material Requisition (`src/components/MaterialRequisitionForm.tsx`)**:
  - Expanded `RabSourceItem` and `RequisitionItem` interfaces to track `sourceType` ('RAB' | 'CHANGE_ORDER' | 'MANUAL') and `changeOrderItemId`.
  - In Change Order fetcher (step 3b), populate `sourceType: 'CHANGE_ORDER'` and `changeOrderItemId: ci.id`.
  - In `handleMoveToRequisition`, assign `sourceRabId` only for RAB items, and `changeOrderItemId` for Change Order items.
  - In `handleSubmit`, send `rab_item_id: item.sourceRabId || null` for RAB items, and `change_order_item_id: item.changeOrderItemId || null` for Change Order items (with `rab_item_id: null`).
  - In existing requisition fetcher, select `change_order_item_id` and match existing requisition items against both `rab_item_id` and `change_order_item_id`.
  - Added visual `Change Order` purple badges to distinguish items in both the right available panel and left requisition list.
- **Requisition Approval & Allocation Check (`src/components/RequisitionApproval.tsx` & `src/utils/rabItemAllocation.ts`)**:
  - Ensured `change_order_item_id` is queried and handled during requisition approval with `change_order_items` join and indicator badges.
  - Enhanced `isRabItemAllocated` in `rabItemAllocation.ts` to detect allocation via `change_order_item_id`.
- **Automated Testing & Verification**:
  - Unit tests verifying Change Order material loading, transfer, and submission payload with `change_order_item_id: 'co-item-uuid-1'` and `rab_item_id: null` in `MaterialRequisitionForm.test.tsx`.
  - Unit test verifying mixed submission separating RAB items from Change Order items.
  - Unit test verifying allocation detection via `change_order_item_id` in `rabItemAllocation.test.ts`.
  - Full test suite regression verification (Vitest: 29 suites, 191 tests, 100% passing; Oxlint: 0 errors/warnings; TypeScript & Vite production build clean).

### Explicitly Excluded
- Changing customer invoice calculations or cashier payment workflows.
- Altering SPK Borongan or WBS task progress check-in logic.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Create SQL database migration for `material_requisition_items` | Antigravity | ✅ Done | 0.2h |
| 2. Update frontend data structures & submit payload in `MaterialRequisitionForm.tsx` | Antigravity | ✅ Done | 0.4h |
| 3. Update `RequisitionApproval.tsx` and `rabItemAllocation.ts` | Antigravity | ✅ Done | 0.2h |
| 4. Write tests for Change Order requisition submission and verify quality | Antigravity | ✅ Done | 0.4h |

## Daily Log

### 2026-10-20
- Initialized Sprint 50: Fix material_requisition_items Foreign Key Constraint for Change Order Items.
- Archived Sprint 49 to `.gsd/sprints/sprint-49-add-detailed-itemized-breakdown-for-approved-change-orders-in-kasir-billing-calculator.md`.
- Created database migration `supabase/migrations/20261020010000_fix_requisition_change_order_fk.sql`:
  - `ALTER TABLE public.material_requisition_items ALTER COLUMN rab_item_id DROP NOT NULL;`
  - Added column `change_order_item_id UUID REFERENCES public.change_order_items(id) ON DELETE SET NULL;`
  - Created performance index `idx_material_req_items_co_id`.
- Updated `src/components/MaterialRequisitionForm.tsx`:
  - Enriched interfaces `RabSourceItem` and `RequisitionItem` with `sourceType?: 'RAB' | 'CHANGE_ORDER'`, `changeOrderItemId?: string | null`, and `rabItemId?: string | null`.
  - Mapped Change Order items in Step 3b with `sourceType: 'CHANGE_ORDER'` and `changeOrderItemId: ci.id`.
  - Segregated `sourceRabId` and `changeOrderItemId` when transferring items into requisition list.
  - Formed payload in `handleSubmit` sending `rab_item_id: null` and `change_order_item_id: item.changeOrderItemId` for Change Order items, preventing foreign key violations against `rab_items`.
  - Added `change_order_item_id` to existing requisition queries and exclusion hydration.
  - Added visual purple badges for Change Order items in both list panels.
- Updated `src/utils/rabItemAllocation.ts`:
  - Expanded `RequisitionLike` contract to include `change_order_item_id`.
  - Updated `isRabItemAllocated` to check `change_order_item_id`.
- Updated `src/components/RequisitionApproval.tsx`:
  - Queried `change_order_item_id` and nested `change_order_items` in `fetchRequisitions`.
  - Resolved item name and price fallbacks against `change_order_items`.
  - Displayed `Change Order` badge in requisition review table.
- Added comprehensive unit tests:
  - `MaterialRequisitionForm.test.tsx`: verified loading, transferring, and submitting Change Order materials with `change_order_item_id` and null `rab_item_id`.
  - `MaterialRequisitionForm.test.tsx`: verified simultaneous submission of mixed RAB and Change Order items with strict ID segregation.
  - `rabItemAllocation.test.ts`: verified allocation matching by `change_order_item_id`.
- Verified quality & regressions:
  - Vitest: 29/29 test suites passing, 191/191 tests passing (100%).
  - Oxlint: 0 errors, 0 warnings across 149 files.
  - TypeScript: Clean compilation (`npx tsc -b`).
  - Production build: Clean bundle generated in 511ms (`npm run build`).
