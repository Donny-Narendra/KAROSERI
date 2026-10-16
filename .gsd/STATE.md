## Current Position
- **Sprint**: Sprint 9 (Upgrade Change Orders to Itemized Point-in-Time Price Snapshot & WBS Allocation)
- **Status**: Sprint completed ✅
- **Milestone**: (Sprint 9 Completed - Ready for next phase/milestone)

## Last Session Summary (Sprint 9 Completed)
1. **Database Migration & Synchronization (`supabase/migrations/20261016020000_itemized_change_orders.sql`)**:
   - `change_orders`: Created header table with `id`, `spk_id`, `co_number`, `description`, `cost_adjustment`, `total_amount`, `status`, `approved_at`, `approved_by`, `created_by`, and `created_at`.
   - `change_order_items`: Created detail item table supporting Point-in-Time Price Snapshotting and WBS allocation:
     - `wbs_stage` (e.g., 'WBS 2: Sasis/Rangka')
     - `item_type` ('MATERIAL' | 'LABOR')
     - `material_id`
     - `item_name`, `quantity`, `unit`
     - `unit_price`: Immutable selling price snapshot
     - `cost_price`: Immutable warehouse HPP snapshot
     - `subtotal`: `GENERATED ALWAYS AS (quantity * unit_price) STORED`
     - `notes`
   - RLS Policies for authenticated read/write.
   - Trigger `trg_sync_change_orders`: Bi-directional synchronization maintaining legacy `spk_amendments` table so Kasir and Admin dashboards function without regressions.
2. **TypeScript & Service Layer Synchronization**:
   - `src/types/database.ts`: Added `ChangeOrderRecord`, `ChangeOrderItemRecord`, `ChangeOrderStatus`, and `ChangeOrderItemType`.
   - `src/services/spkService.ts`: Added `getChangeOrders(spkId)`, `createChangeOrder(...)`, `approveChangeOrder(...)`, and `rejectChangeOrder(...)`.
3. **Frontend Implementation (`AmendmentManager.tsx`)**:
   - Upgraded Change Orders UI on `/service-advisor` from text/lump-sum into a rich itemized builder.
   - Supports adding multiple Material and Labor items per Change Order.
   - Auto-fills snapshot prices (`unit_price` selling price and `cost_price` HPP) upon selecting material from master warehouse.
   - Real-time gross margin and HPP calculation.
   - Filter tabs (`ALL`, `PENDING`, `APPROVED`, `REJECTED`) and expandable itemized detail cards.
4. **Mandor & Gate 2 Warehouse Budget Integration**:
   - `RequisitionApproval.tsx`: Incorporates approved Change Order materials into `rabBudgetLimit` Gate 2 calculation.
   - `GoodsIssueForm.tsx`: Merges approved Change Order materials into `rabMaterials`, expanding allowed materials and quotas to eliminate false over-budget locks.
   - `MaterialRequisitionForm.tsx`: Mandor source list now dynamically includes approved Change Order materials tagged with `[CO: ...]`, allowing requisition of amended materials per WBS stage.
5. **Empirical Verification & Quality Gates**:
   - Empirical validation script (`verify_change_orders.cjs`): 100% PASS across 6 automated stages proving column schema integrity, subtotal generation, price immutability under master price inflation, trigger sync, and approval lifecycle.
   - `npm run build`: 100% PASS (0 errors, bundle compiled in 599ms).
   - `npm run lint`: 100% PASS (0 errors, 66 pre-existing warnings).

## Blockers
None.

## Next Steps
1. Verify live browser interaction in Service Advisor dashboard:
   - Navigate to `/service-advisor`, select an SPK, open tab "Change Orders".
   - Click "Buat Change Order Baru", add items (Material & Labor), submit, and verify itemized card view.
   - Test approval and verify materials appear in Mandor requisition and Warehouse goods issue without over-budget warnings.
