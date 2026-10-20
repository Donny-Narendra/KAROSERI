## Current Position
- **Sprint**: Sprint 50 — Fix material_requisition_items Foreign Key Constraint for Change Order Items
- **Status**: Completed ✅
- **Milestone**: Core Business Recommendations Hardening — Enterprise Production Readiness

## Last Session Summary
Completed Sprint 50 fixing foreign key constraint violation (`material_requisition_items_rab_item_id_fkey`) when requesting materials originating from Change Orders in `/mandor` portal:
1. **Database Migration (`supabase/migrations/20261020010000_fix_requisition_change_order_fk.sql`)**:
   - Set `rab_item_id` in `material_requisition_items` to nullable (`DROP NOT NULL`).
   - Added column `change_order_item_id UUID REFERENCES public.change_order_items(id) ON DELETE SET NULL`.
   - Created index `idx_material_req_items_co_id` on `material_requisition_items(change_order_item_id)`.
2. **Frontend Requisition Management (`src/components/MaterialRequisitionForm.tsx`)**:
   - Updated `RabSourceItem` and `RequisitionItem` interfaces to distinguish `sourceType` ('RAB' | 'CHANGE_ORDER') and `changeOrderItemId`.
   - Mapped Change Order items in Step 3b with `sourceType: 'CHANGE_ORDER'` and `changeOrderItemId: ci.id`.
   - Mapped submit payload in `handleSubmit` sending `rab_item_id: null` and `change_order_item_id: item.changeOrderItemId` for Change Order items, preventing FK constraint violations against `rab_items`.
   - Supported `change_order_item_id` in existing requisition queries, hydration, and right-panel available exclusion.
   - Added visual `Change Order` purple badges for Change Order items in both list panels.
3. **Requisition Approval & Allocation Check (`src/components/RequisitionApproval.tsx` & `src/utils/rabItemAllocation.ts`)**:
   - Updated `RequisitionApproval.tsx` to query `change_order_item_id` and join `change_order_items`, with fallback item naming/pricing and review badges.
   - Enhanced `isRabItemAllocated` in `rabItemAllocation.ts` to detect allocations by `change_order_item_id`.
4. **Testing & Verification**:
   - Added unit test in `MaterialRequisitionForm.test.tsx` verifying Change Order material loading, transfer, and submission with `change_order_item_id` and `rab_item_id: null`.
   - Added unit test in `MaterialRequisitionForm.test.tsx` verifying simultaneous mixed submission segregating RAB vs Change Order IDs.
   - Added unit test in `rabItemAllocation.test.ts` verifying allocation detection via `change_order_item_id`.
   - Full Vitest suite: 29/29 test suites passing, 191/191 tests passing (100%).
   - Oxlint: 0 errors, 0 warnings across 149 files.
   - TypeScript: Clean static compilation (`npx tsc -b`).
   - Production Build: Clean Vite bundle generated in 511ms (`npm run build`).

## Quality & Verification Status
- **Vitest Unit & Component Testing:** 29/29 test suites passing, 191/191 tests passing (100%).
- **Linter (Oxlint):** 0 errors, 0 warnings across 149 files with 113 rules.
- **TypeScript Static Analysis:** Clean compilation with 0 errors (`npx tsc -b`).
- **Production Build:** Clean build in 511ms (`npm run build`).

## Technical Debt Backlog
None.

## Next Up
- Ready for feature planning via `/plan` or production deployment.

## Blockers
None.
