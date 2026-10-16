## Current Position
- **Sprint**: Sprint 9 (Upgrade Change Orders to Itemized Point-in-Time Price Snapshot & WBS Allocation)
- **Status**: Sprint in progress 🔄
- **Milestone**: (Paused during Sprint 9)

## Last Session Summary (Sprint 8 Completed)
1. **Database Migration & PostgreSQL Triggers (`supabase/migrations/20261016010000_point_in_time_price_snapshot.sql`)**:
   - `materials`: Added `cost_price` (HPP Beli Gudang) and `selling_price` (Harga Jual Patokan).
   - `rab_items`: Added `spk_id`, `material_name`, `unit_price`, `cost_price`, `subtotal` (as `GENERATED ALWAYS AS (quantity * unit_price) STORED`), and `is_locked`.
   - `requisition_items` & `material_requisition_items`: Added snapshot fields `unit_price`, `cost_price`, and `subtotal`.
   - `spk`: Added document locking fields `is_pricing_locked`, `locked_at`, `locked_by`.
   - Trigger `trg_lock_spk_pricing`: Automatically enforces document immutability upon transition to `ACTIVE`, `APPROVED`, or `IN_PROGRESS`.
2. **TypeScript & Model Synchronization**:
   - Synchronized `SpkRecord`, `RabItemRecord`, `MaterialRequisitionItemRecord`, and `Material`.
3. **Frontend Implementation & Document Locking UI**:
   - `RabCalculator.tsx`: Read-only lock banner, row-level lock badges, immutable price snapshotting.
   - `MaterialRequisitionForm.tsx`: Snapshots `cost_price`, `unit_price`, and `material_name`.
   - `InventoryManager.tsx` & `SAInventoryPanel.tsx`: Added HPP and selling price support.

## Current Sprint 9 Scope & Objectives
1. **Database Migration**:
   - Implement `change_orders` header table (`co_number`, `status`, `approved_at`, `approved_by`, `cost_adjustment`).
   - Create `change_order_items` detail table with snapshot fields (`wbs_stage`, `item_type`, `material_id`, `item_name`, `quantity`, `unit`, `unit_price`, `cost_price`, `subtotal`, `notes`).
   - RLS policies and backward compatibility with `spk_amendments`.
2. **TypeScript & Service Layer**:
   - Define types in `src/types/database.ts` and functions in `src/services/spkService.ts`.
3. **Frontend Upgrade**:
   - Upgrade `AmendmentManager.tsx` with itemized line items, price snapshots, and WBS allocation.
4. **Mandor & Gate 2 Warehouse Budget Integration**:
   - Synchronize approved Change Order materials into Gate 2 budget limits (`GoodsIssueForm.tsx`, `RequisitionApproval.tsx`) and Mandor WBS requisitions (`MaterialRequisitionForm.tsx`).
5. **Empirical Verification**:
   - Automated script (`verify_change_orders.cjs`), `npm run build`, and `npm run lint`.

## Blockers
None.

## Next Steps
1. Execute PostgreSQL migration `supabase/migrations/20261016020000_itemized_change_orders.sql`.
2. Update TypeScript database types and `spkService.ts`.
3. Upgrade `AmendmentManager.tsx` with itemized UI.
4. Integrate with Gate 2 Warehouse and Mandor WBS allocation.
5. Verify with automated empirical script and build check.
