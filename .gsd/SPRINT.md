# Sprint 9 — Upgrade Change Orders to Itemized Point-in-Time Price Snapshot & WBS Allocation

> **Duration**: 2026-10-16 to 2026-10-16
> **Status**: In Progress

## Goal
Upgrade Change Orders on Service Advisor dashboard (`/service-advisor`) to record itemized material and labor detail with immutable point-in-time price snapshots (`unit_price` selling price and `cost_price` HPP), allocate items to specific WBS stages, and seamlessly synchronize with Mandor RAB allocation and Warehouse Gate 2 quota to eliminate false over-budget warnings.

## Scope

### Included
- **Database Schema & Migration**:
  - Create/alter `change_orders` header table with `co_number`, `status` (`DRAFT`, `PENDING`, `APPROVED`, `REJECTED`), `cost_adjustment`, `total_amount`, `approved_at`, and `approved_by`.
  - Create `change_order_items` table with columns:
    - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `change_order_id UUID REFERENCES change_orders(id) ON DELETE CASCADE`
    - `spk_id UUID REFERENCES spk(id) ON DELETE CASCADE`
    - `wbs_stage VARCHAR(50) NOT NULL` (e.g. 'WBS 2: Sasis/Rangka')
    - `item_type VARCHAR(20) DEFAULT 'MATERIAL'` ('MATERIAL' | 'LABOR')
    - `material_id UUID REFERENCES materials(id)`
    - `item_name VARCHAR(255) NOT NULL`
    - `quantity NUMERIC(12, 2) NOT NULL DEFAULT 1`
    - `unit VARCHAR(50) DEFAULT 'pcs'`
    - `unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0` (Snapshot selling price saat CO dibuat)
    - `cost_price NUMERIC(15, 2) DEFAULT 0` (Snapshot HPP gudang saat CO dibuat)
    - `subtotal NUMERIC(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED`
    - `notes TEXT`
    - `created_at TIMESTAMPTZ DEFAULT NOW()`
  - RLS Policies for `change_orders` and `change_order_items` (allow authenticated read/write).
  - Compatibility synchronization for legacy `spk_amendments` consumers (Kasir, Admin).
- **TypeScript Models & Service Layer**:
  - Add `ChangeOrderRecord`, `ChangeOrderItemRecord`, `ChangeOrderStatus`, and `ChangeOrderItemType` in `src/types/database.ts`.
  - Enhance `src/services/spkService.ts` to manage itemized change orders, auto-generate sequential `co_number`, and handle approval/rejection workflows.
- **Frontend Itemized Change Order UI**:
  - Upgrade `AmendmentManager.tsx` on `/service-advisor`:
    - Modal/form with dynamic line items: item type (Material/Labor), material selector with auto-fill price & cost, WBS stage dropdown, quantity, unit, price snapshots, notes, and live margin calculation.
    - Itemized detail cards for historical and pending Change Orders with line-by-line item breakdown, WBS stage tags, and status actions.
- **Mandor & Gate 2 Warehouse Budget Integration**:
  - Update `RequisitionApproval.tsx` and `GoodsIssueForm.tsx` to include approved Change Order materials in Gate 2 budget limits and allowed materials.
  - Update `MaterialRequisitionForm.tsx` so Mandor can view and requisition materials added via approved Change Orders for the respective WBS category.
- **Empirical Validation**:
  - Automated test script validating snapshot immutability, subtotal generation, RLS policies, and Gate 2 budget expansion.
  - TypeScript build verification (`npm run build`) and linting (`npm run lint`).

### Explicitly Excluded
- Re-architecting core WBS checklist approval flows.
- Modifying cash payments recording table schema (`cash_payments`).

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Create and execute PostgreSQL migration for `change_orders`, `change_order_items`, and RLS policies | Antigravity | ✅ Done | 0.4h |
| 2. Synchronize TypeScript types and service layer in `src/types/database.ts` and `src/services/spkService.ts` | Antigravity | ✅ Done | 0.3h |
| 3. Upgrade `AmendmentManager.tsx` with itemized material/labor entry, price snapshotting, and WBS allocation | Antigravity | ✅ Done | 0.6h |
| 4. Update Gate 2 Warehouse (`GoodsIssueForm.tsx`, `RequisitionApproval.tsx`) & Mandor (`MaterialRequisitionForm.tsx`) to recognize approved Change Order items | Antigravity | ✅ Done | 0.5h |
| 5. Run empirical test script (`verify_change_orders.cjs`) and check `npm run build` & `npm run lint` | Antigravity | ✅ Done | 0.4h |

## Daily Log

### 2026-10-16
- Archived Sprint 8 to `.gsd/sprints/sprint-8-implement-point-in-time-price-snapshot.md`.
- Initialized Sprint 9 for Upgrading Change Orders to Itemized Point-in-Time Price Snapshot & WBS Allocation.
- Created and executed migration `20261016020000_itemized_change_orders.sql` adding `change_orders` and `change_order_items` tables with RLS and trigger synchronization with legacy `spk_amendments`.
- Updated `src/types/database.ts` (`ChangeOrderRecord`, `ChangeOrderItemRecord`, `ChangeOrderStatus`, `ChangeOrderItemType`).
- Enhanced `src/services/spkService.ts` with `getChangeOrders`, `createChangeOrder`, `approveChangeOrder`, and `rejectChangeOrder`.
- Completely revamped `AmendmentManager.tsx` with dynamic line items (Material/Labor), live gross margin & HPP calculations, WBS stage allocation, auto-generating sequential `co_number`, and expandable itemized detail cards.
- Integrated approved Change Order materials into Gate 2 Warehouse budget (`RequisitionApproval.tsx`, `GoodsIssueForm.tsx`) and Mandor WBS source list (`MaterialRequisitionForm.tsx`), eliminating false over-budget warnings.
- Ran empirical validation test `verify_change_orders.cjs` with 100% pass across 6 stages.
- Verified TypeScript build (`npm run build`) and linting (`npm run lint`) with 0 errors.

## Risks & Blockers

| Risk | Impact | Mitigation |
|------|--------|------------|
| Existing components querying legacy `spk_amendments` table (Kasir, Admin) | Med | Maintain backward compatibility by syncing `change_orders` header with `spk_amendments` or supporting dual-read |
| Master price fluctuation altering historical change orders | High | Enforce immutable point-in-time price snapshot in `change_order_items` (`unit_price` & `cost_price`) |

---

*Last updated: 2026-10-16*
