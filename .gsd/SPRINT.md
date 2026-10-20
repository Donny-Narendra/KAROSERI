# Sprint 51 — Ingest Approved Change Order Labor and Overhead Items into Mandor Workflows

> **Duration**: 2026-10-20 to 2026-10-21
> **Status**: Completed ✅

## Goal
Ingest approved Change Order items with `item_type = 'LABOR'` into the Mandor SPK Borongan guide/assignment flow (`SpkBoronganPanel.tsx`) and `item_type = 'OVERHEAD'` into the Mandor Overhead Logging modal presets (`SpkOverheadModal.tsx`), persist `change_order_item_id` to execution logs, and synchronize the PostgreSQL view `view_wbs_cost_variance` so Change Order labor and overhead budgets are aggregated cleanly into financial variance reporting.

## Scope

### Included
- **Database Migration (`supabase/migrations/20261020020000_ingest_co_labor_overhead_into_mandor.sql`)**:
  - Add optional `change_order_item_id UUID REFERENCES public.change_order_items(id) ON DELETE SET NULL` to `public.spk_borongan`.
  - Add optional `change_order_item_id UUID REFERENCES public.change_order_items(id) ON DELETE SET NULL` to `public.spk_overhead_logs`.
  - Create performance indexes on `spk_borongan(change_order_item_id)` and `spk_overhead_logs(change_order_item_id)`.
  - Recreate `view_wbs_cost_variance` ensuring `co_budget` CTE aggregates MATERIAL, LABOR, and OVERHEAD from `change_order_items coi JOIN change_orders co ON coi.change_order_id = co.id WHERE co.status = 'APPROVED'`.
- **SPK Borongan Modal (`src/components/SpkBoronganPanel.tsx`)**:
  - Fetch LABOR items from approved `change_orders` via `change_order_items` matching SPK ID and current WBS stage.
  - Merge with RAB LABOR items in the "Panduan Pagu Jasa / Pekerjaan" panel.
  - Display distinct visual badge `[CO]` for Change Order labor items.
  - Auto-populate task description and contract value when transferred/clicked.
  - Persist `change_order_item_id` (and null `rab_item_id`) on assignment creation.
  - Exclude already assigned Change Order items from the guide.
- **Overhead Logging Modal (`src/components/SpkOverheadModal.tsx`)**:
  - Fetch OVERHEAD items from approved `change_orders` via `change_order_items` matching SPK ID and active WBS stage.
  - Merge with RAB OVERHEAD items as quick preset cards labeled `⚡ [CO] ${item.itemName}` with quota and unit rate.
  - Auto-fill overhead name, frequency quantity, and unit rate when clicked.
  - Save `change_order_item_id` into `spk_overhead_logs` payload.
- **Service & Types Synchronization**:
  - Update `CreateSpkOverheadLogPayload` and `SpkOverheadLog` in `src/types/financialReports.ts` to include `change_order_item_id?: string | null`.
  - Update `financialReportsService.createSpkOverheadLog` in `src/services/financialReportsService.ts`.
  - Update `isRabItemAllocated`, `AssignmentLike`, and `OverheadLogLike` in `src/utils/rabItemAllocation.ts` to support allocation detection via `change_order_item_id`.
- **Automated Testing & Regression Verification**:
  - Update and expand `SpkBoronganPanel.test.tsx` to test Change Order LABOR loading, badge display, transfer, submission payload, and active assignment exclusion.
  - Update and expand `SpkOverheadModal.test.tsx` to test Change Order OVERHEAD loading, preset rendering with `[CO]` badge, selection, and submission with `change_order_item_id`.
  - Run full Vitest suite (29/29 suites, 195/195 tests passing), Oxlint (0 errors, 0 warnings), TypeScript check (`npx tsc -b`), and Vite production build.

### Explicitly Excluded
- Modifying customer billing invoices or payment gateway logic.
- Changing QC inspection criteria or WBS step status completion rules.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Create SQL database migration for `spk_borongan`, `spk_overhead_logs`, and `view_wbs_cost_variance` | Antigravity | ✅ Done | 0.3h |
| 2. Merge approved Change Order LABOR items into `SpkBoronganPanel.tsx` | Antigravity | ✅ Done | 0.5h |
| 3. Merge approved Change Order OVERHEAD items into `SpkOverheadModal.tsx` & update financial types | Antigravity | ✅ Done | 0.5h |
| 4. Update unit tests in `SpkBoronganPanel.test.tsx` and `SpkOverheadModal.test.tsx` | Antigravity | ✅ Done | 0.5h |
| 5. Regression testing, linting, build check, and sprint documentation | Antigravity | ✅ Done | 0.2h |

## Daily Log

### 2026-10-20
- Initialized Sprint 51: Ingest Approved Change Order Labor and Overhead Items into Mandor Workflows.
- Archived Sprint 50 to `.gsd/sprints/sprint-50-fix-material-requisition-items-foreign-key-constraint-for-change-order-items.md`.
- Created database migration `supabase/migrations/20261020020000_ingest_co_labor_overhead_into_mandor.sql`:
  - Added optional column `change_order_item_id UUID REFERENCES public.change_order_items(id) ON DELETE SET NULL` to `spk_borongan`.
  - Added optional column `change_order_item_id UUID REFERENCES public.change_order_items(id) ON DELETE SET NULL` to `spk_overhead_logs`.
  - Created performance indexes `idx_spk_borongan_co_item_id` and `idx_spk_overhead_logs_co_item_id`.
  - Rebuilt `public.view_wbs_cost_variance` ensuring `co_budget` aggregates 3 elements (MATERIAL, LABOR, OVERHEAD) joining `change_orders` on `status = 'APPROVED'`, and unified with `stages` CTE.
- Updated `src/types/financialReports.ts` and `src/services/financialReportsService.ts`:
  - Extended `SpkOverheadLog` and `CreateSpkOverheadLogPayload` interfaces to include `change_order_item_id?: string | null`.
  - Updated `createSpkOverheadLog` in service layer to forward `change_order_item_id`.
- Updated `src/utils/rabItemAllocation.ts`:
  - Added `change_order_item_id` to `AssignmentLike` and `OverheadLogLike`.
  - Updated `isRabItemAllocated` matching logic to detect allocations through `change_order_item_id`.
- Updated `src/components/SpkBoronganPanel.tsx`:
  - Enriched `SpkBorongan` and `RabMaterial` interfaces with `sourceType?: 'RAB' | 'CHANGE_ORDER'` and `changeOrderItemId?: string`.
  - In `fetchRabMaterials`, queried approved Change Orders bertipe `'LABOR'` for active SPK & WBS category.
  - Merged Change Order labor items into `combinedAvailable` and filtered allocated items via `isRabItemAllocated`.
  - Formatted transferred items with `[CO]` prefix and auto-populated task description and contract value.
  - On submit, saved `change_order_item_id` with `rab_item_id = null` for Change Order labor items.
  - Added visual purple `[CO]` badge and Change Order banner styling.
- Updated `src/components/SpkOverheadModal.tsx`:
  - Enriched `RabOverheadItem` interface with `sourceType?: 'RAB' | 'CHANGE_ORDER'`, `changeOrderItemId?: string`, and `coNumber?: string`.
  - In `loadRabOverheadItems`, queried approved Change Orders bertipe `'OVERHEAD'` and merged with active stage items.
  - Calculated quota and realized amount taking into account `log.change_order_item_id`.
  - Rendered quick preset cards under header **"ALOKASI OVERHEAD DARI RAB & CHANGE ORDERS"** with `⚡ [CO] ${itemName}` and unit rate.
  - Auto-populated form inputs on preset click and submitted `change_order_item_id` into `spk_overhead_logs`.
- Updated and expanded automated test suites:
  - `SpkBoronganPanel.test.tsx`: Added 2 unit tests verifying Change Order LABOR merging, `[CO]` badge display, auto-fill, `change_order_item_id` submission payload, and active assignment exclusion. (7/7 tests pass).
  - `SpkOverheadModal.test.tsx`: Added unit test verifying Change Order OVERHEAD preset loading with `[CO]` badge, auto-fill, and submission payload with `change_order_item_id`. (7/7 tests pass).
- Full regression verification:
  - Vitest: 29 suites, 195 tests, 100% passing.
  - Oxlint: 0 errors, 0 warnings across 149 files.
  - TypeScript: 0 errors (`npx tsc -b`).
  - Production build: Clean bundle generated in 495ms (`npm run build`).
