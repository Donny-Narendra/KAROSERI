# Sprint 5 — Fix Zero-Price Calculation on Mandor Requisition and Warehouse Gate 2

> **Duration**: 2026-10-15 to 2026-10-15
> **Status**: Completed

## Goal
Fix zero-price display and calculation on Mandor Requisition and Warehouse Gate 2 (`/warehouse` tab "Mandor Requests"), ensuring unit prices, subtotals, and total estimated requisition costs are accurately persisted, resolved from snapshots/RAB/master materials, and verified against Gate 2 limits.

## Scope

### Included
- Mandor Side (`MaterialRequisitionForm.tsx`):
  - In `loadInitialData`, derive unit price from `item.item_total / quantity` if master material unit price is 0 or unlinked.
  - In `handleSubmitRequisition`, include `unit_price`, `subtotal`, and `wbs_stage` in payload when creating `material_requisition_items`.
  - Resolve `material_id` reliably from master materials or item references before submission.
- Warehouse Side (`RequisitionApproval.tsx`):
  - In `fetchRequisitions`, explicitly query `unit_price`, `subtotal`, and `wbs_stage` from `material_requisition_items` and join `rab_items` and `materials`.
  - Implement robust multi-tier fallback price resolution: check snapshot `unit_price` -> `materials.unit_price` -> `rab_items.item_total / quantity` -> match master materials by name -> match SPK RAB items by name.
  - Ensure item unit price, item subtotal, `TOTAL ESTIMASI BIAYA REQUISITION`, and Pagu Gate 2 badge accurately reflect accumulated cost.
- Database & Schema:
  - Added migration `20261015020000_add_subtotal_and_wbs_stage_to_material_requisition_items.sql` to support `subtotal` and `wbs_stage` on `material_requisition_items`.
  - Backfilled existing pending requisition items that had `unit_price = 0` using RAB allocation / master materials data.
- Audit & Consistency:
  - Verified WBS category consistency across ticket requisition and WBS allocation stage.
  - Verified with TypeScript build (`npm run build`) and lint (`npm run lint`).

### Explicitly Excluded
- Altering unrelated warehouse stock movement logic.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| Database migration: Add `subtotal` & `wbs_stage` to `material_requisition_items` and backfill zero-price items | Antigravity | ✅ Done | 0.5h |
| Fix Mandor requisition submission (`MaterialRequisitionForm.tsx`) with unit price, subtotal, and resolved material | Antigravity | ✅ Done | 0.5h |
| Fix Warehouse requisition display & Gate 2 calculation (`RequisitionApproval.tsx`) with fallback joins | Antigravity | ✅ Done | 0.5h |
| Verify WBS stage consistency across Mandor and Warehouse flows | Antigravity | ✅ Done | 0.25h |
| Test and verify with `npm run build` and `npm run lint` | Antigravity | ✅ Done | 0.25h |

## Daily Log

### 2026-10-15
- Sprint 5 initialized based on user request.
- Archived Sprint 4 to `.gsd/sprints/sprint-4-enforce-hard-gate-validation-mandor-qc.md`.
- Analyzed root causes:
  1. `MaterialRequisitionForm.tsx` omitted `unit_price` in `itemsToInsert`.
  2. `RequisitionApproval.tsx` query omitted `unit_price` from `material_requisition_items` select clause and lacked fallback joins to `rab_items` and master catalog.
  3. When `RabCalculator` saved RAB estimates, `DELETE` on `rab_items` triggered `ON DELETE SET NULL` on `material_requisition_items.rab_item_id`.
  4. SPK `87c59bd4-1f5d-4d2b-9570-bcae1c494661` had 5 pending items with zero unit price in database.
- Implemented and executed database migration `supabase/migrations/20261015020000_add_subtotal_and_wbs_stage_to_material_requisition_items.sql`:
  - Added `subtotal` NUMERIC(15, 2) DEFAULT 0 and `wbs_stage` TEXT.
  - Backfilled `wbs_stage` from `material_requisitions.wbs_category`.
  - Backfilled `material_id`, `unit_price`, and `subtotal` for zero-price items from `materials` and `rab_items`.
- Updated `src/components/MaterialRequisitionForm.tsx`:
  - Extended `RequisitionItem` interface with optional alias fields (`material_id`, `material_name`, `unit_price`, `estimated_price`, `wbs_stage`).
  - Added multi-tier unit price calculation in `loadInitialData` (`item.item_total / quantity` fallback).
  - Selected `unit_price`, `subtotal`, and `wbs_stage` during initial requisition hydration.
  - Included `unit_price`, `subtotal`, and `wbs_stage` in `handleSubmitRequisition` payload.
- Updated `src/components/RequisitionApproval.tsx`:
  - Added `unit_price`, `subtotal`, `wbs_stage`, and `rab_items` to `fetchRequisitions` query.
  - Added fallback fetch of master materials and SPK RAB items to resolve prices for unlinked/custom items.
  - Populated item `unit_price`, `estimated_price`, and `subtotal`.
  - Passed `custom_unit_price: item.unit_price || 0` to `inventory_transactions`.
  - Rendered accurate prices in table and Pagu Gate 2 badge.
- Verified build: `npm run build` completed with 0 errors.
- Verified linter: `npm run lint` completed with 0 errors.
- Verified live Supabase data: "material test 4" in SPK-1157 now shows unit price Rp 555 and subtotal Rp 1.665, and Pagu Gate 2 displays Rp 1.665.

## Retrospective (2026-10-15)

### What Went Well
- Quick multi-tier fallback architecture resolved historical and newly created items seamlessly.
- Database migration added snapshotting fields without breaking backward compatibility or triggering RLS issues.
- Build and lint checks passed cleanly on the first run.

### What Could Improve
- RequisitionApproval previously assumed a generic yellow warning for all tickets without taking into account actual commitments against RAB.

### Action Items
- [ ] Implement tiered Gate 2 budget warnings (Sprint 6).
