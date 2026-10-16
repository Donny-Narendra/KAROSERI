## Current Position
- **Sprint**: Sprint 8 (Implement immutable Point-in-Time Price Snapshot & Document Locking across KaroseriOps)
- **Status**: Sprint completed ✅
- **Milestone**: (Sprint 8 Completed - Ready for Phase 76 or next Milestone)

## Last Session Summary (Sprint 8)
1. **Database Migration & PostgreSQL Triggers (`supabase/migrations/20261016010000_point_in_time_price_snapshot.sql`)**:
   - `materials`: Added `cost_price` (HPP Beli Gudang) and `selling_price` (Harga Jual Patokan).
   - `rab_items`: Added `spk_id`, `material_name`, `unit_price`, `cost_price`, `subtotal` (as `GENERATED ALWAYS AS (quantity * unit_price) STORED`), and `is_locked`.
   - `requisition_items` & `material_requisition_items`: Added snapshot fields `unit_price`, `cost_price`, and `subtotal`.
   - `spk`: Added document locking fields `is_pricing_locked`, `locked_at`, `locked_by`.
   - Trigger `trg_lock_spk_pricing`: Automatically enforces document immutability upon transition to `ACTIVE`, `APPROVED`, or `IN_PROGRESS` by setting `spk.is_pricing_locked = TRUE`, recording `locked_at`, and locking all related `rab_items` (`is_locked = TRUE`).
   - Backfilled existing database records with 100% data integrity.
2. **TypeScript & Model Synchronization**:
   - `src/types/database.ts`: Synchronized `SpkRecord`, `RabItemRecord`, and `MaterialRequisitionItemRecord`.
   - `src/services/inventoryService.ts`: Added `cost_price` and `selling_price` properties to `Material` model.
3. **Frontend Implementation & Document Locking UI**:
   - `src/components/RabCalculator.tsx`:
     - Snapshots `spk_id`, `material_name`, `unit_price`, and `cost_price` on creation/update.
     - Detects `is_pricing_locked` or non-DRAFT status and renders a prominent amber read-only lock banner directing modifications through Change Order (`spk_amendments`).
     - Renders row-level lock badges (`Terkunci`) and disables item edit/delete/save actions when locked.
     - Displays `Harga Modal (HPP)` alongside `Harga Jual/Satuan` for transparent gross profit visibility.
   - `src/components/MaterialRequisitionForm.tsx`:
     - Snapshots `unit_price`, `cost_price`, and `material_name` during requisition item submission.
   - `src/components/InventoryManager.tsx` & `src/components/SAInventoryPanel.tsx`:
     - Added inputs and table columns for both `cost_price` (HPP) and `selling_price` (Harga Jual Patokan).
4. **Empirical Verification & Quality Gates**:
   - Empirical validation script (`verify_price_immutability.cjs`): 100% PASS across 7 automated stages:
     - Verified master warehouse price inflation does NOT alter historical `rab_items` or `material_requisition_items`.
     - Verified trigger `trg_lock_spk_pricing` automatically locks SPK and child RAB rows upon status change to `ACTIVE`.
   - `npm run build`: 100% PASS (0 errors, bundle compiled in 561ms).
   - `npm run lint`: 100% PASS (0 errors, 66 pre-existing warnings).

## Blockers
None.

## Next Steps
1. Test RAB Calculator in browser:
   - For a `DRAFT` SPK: Verify adding materials snapshots `cost_price` and `unit_price`, and subtotal is calculated automatically.
   - For an `ACTIVE` SPK: Verify the amber lock banner appears and all inputs/buttons are disabled.
2. Review the Change Order / SPK Tambahan workflow for handling post-lock specification adjustments.


