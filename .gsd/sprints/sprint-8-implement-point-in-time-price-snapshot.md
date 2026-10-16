# Sprint 8 — Implement Immutable Point-in-Time Price Snapshot & Document Locking across KaroseriOps

> **Duration**: 2026-10-16 to 2026-10-16
> **Status**: Completed

## Goal
Implement decoupled point-in-time pricing snapshots across all transaction detail entities (`rab_items`, `material_requisition_items`, `requisition_items`, `inventory_transactions`) and enforce strict document lifecycle locking on SPK and RAB upon transitioning to `ACTIVE` or `APPROVED`, ensuring raw material price fluctuations in master inventory never alter approved contracts, active work orders, or billing records.

## Scope

### Included
- **Database Schema & Migrations**:
  - `materials`: Add `cost_price` (HPP) and `selling_price` (Harga Jual Patokan).
  - `rab_items`: Add `spk_id`, `material_name`, `unit_price`, `cost_price`, `subtotal` (GENERATED ALWAYS AS `(quantity * unit_price)` STORED), `is_locked`.
  - `requisition_items` & `material_requisition_items`: Ensure independent `unit_price`, `cost_price`, `subtotal` snapshot storage.
  - `spk`: Add document locking fields `is_pricing_locked`, `locked_at`, `locked_by`.
  - Trigger `trg_lock_spk_pricing`: Automatically set `is_pricing_locked = TRUE`, `locked_at = NOW()`, and lock all corresponding `rab_items` (`is_locked = TRUE`) when SPK status transitions from `DRAFT` (or unapproved) to `ACTIVE`, `APPROVED`, or `IN_PROGRESS`.
  - Data backfill for existing records to ensure data integrity and zero broken relations.
- **Frontend & Service Layer Integration**:
  - `src/types/database.ts` & `src/services/inventoryService.ts`: Synchronize TypeScript types with new snapshot and locking fields.
  - `RabCalculator.tsx`:
    - Persist `spk_id`, `material_name`, `unit_price`, `cost_price` snapshot to `rab_items`.
    - Retrieve price snapshots directly from `rab_items` rather than calculating from total.
    - Enforce Document Locking: If `spkDetails.is_pricing_locked` or SPK is not in `DRAFT`, set RAB editor to read-only with a prominent lock banner prohibiting direct modifications (mandating Change Order / SPK Tambahan).
  - `MaterialRequisitionForm.tsx`:
    - Persist `cost_price`, `unit_price`, `material_name`, and `subtotal` snapshot when submitting items.
  - `InventoryManager.tsx` & `SAInventoryPanel.tsx`:
    - Provide input and visibility for `cost_price` (HPP) and `selling_price` (Harga Jual Patokan) alongside `unit_price`.
- **Quality Assurance & Empirical Verification**:
  - Full TypeScript build check (`npm run build`).
  - Linting validation (`npm run lint`).
  - Empirical database verification script proving:
    - Master inventory price changes do NOT affect historical RAB or requisition item prices.
    - Trigger `trg_lock_spk_pricing` automatically locks SPK and RAB items when SPK moves to `ACTIVE`.

### Explicitly Excluded
- Re-architecting the WBS stage categories.
- Modifying cash payments recording table schema.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| Create and execute PostgreSQL migration for immutable price snapshots, SPK document locking, and trigger | Antigravity | ✅ Done | 0.5h |
| Update TypeScript database types & service layers (`inventoryService.ts`, etc.) | Antigravity | ✅ Done | 0.3h |
| Update `RabCalculator.tsx` with immutable price snapshot persistence and document status locking UI | Antigravity | ✅ Done | 0.5h |
| Update `MaterialRequisitionForm.tsx` to snapshot cost price & unit price | Antigravity | ✅ Done | 0.3h |
| Update inventory management components to support HPP (`cost_price`) and selling price (`selling_price`) | Antigravity | ✅ Done | 0.4h |
| Run empirical tests, verification script, and verify `npm run build` & `npm run lint` | Antigravity | ✅ Done | 0.5h |

## Daily Log

### 2026-10-16
- Archived Sprint 7 to `.gsd/sprints/sprint-7-enable-sa-warehouse-ops-audit.md`.
- Initialized Sprint 8 for Immutable Point-in-Time Price Snapshot & Document Locking across KaroseriOps.
- Executed migration `20261016010000_point_in_time_price_snapshot.sql` adding decoupled snapshot pricing to `materials`, `rab_items`, `material_requisition_items`, and `requisition_items`.
- Created PostgreSQL trigger `trg_lock_spk_pricing` to automatically lock SPK and associated `rab_items` when transitioning to `ACTIVE`/`APPROVED`.
- Backfilled existing historical records with 100% data integrity.
- Updated `src/types/database.ts` and `src/services/inventoryService.ts`.
- Integrated `RabCalculator.tsx` with read-only document locking banner, row lock badges, and Change Order modal guidance.
- Updated `MaterialRequisitionForm.tsx`, `InventoryManager.tsx`, and `SAInventoryPanel.tsx` with `cost_price` (HPP) and `selling_price`.
- Ran empirical database test `verify_price_immutability.cjs` with 100% pass rate confirming decoupled historical pricing and automated trigger locking.
- Verified TypeScript build (`npm run build`) and linting (`npm run lint`) with 0 errors.
