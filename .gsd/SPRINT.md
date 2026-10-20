# Sprint 51 — Ingest Approved Change Order Labor and Overhead Items into Mandor Workflows

> **Duration**: 2026-10-20 to 2026-10-21
> **Status**: In Progress 🟡

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
- **Automated Testing & Regression Verification**:
  - Update and expand `SpkBoronganPanel.test.tsx` to test Change Order LABOR loading, badge display, transfer, and submission payload.
  - Update and expand `SpkOverheadModal.test.tsx` to test Change Order OVERHEAD loading, preset rendering, selection, and submission.
  - Run full Vitest suite, Oxlint, and Vite production build.

### Explicitly Excluded
- Modifying customer billing invoices or payment gateway logic.
- Changing QC inspection criteria or WBS step status completion rules.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Create SQL database migration for `spk_borongan`, `spk_overhead_logs`, and `view_wbs_cost_variance` | Antigravity | ⬜ Todo | 0.3h |
| 2. Merge approved Change Order LABOR items into `SpkBoronganPanel.tsx` | Antigravity | ⬜ Todo | 0.5h |
| 3. Merge approved Change Order OVERHEAD items into `SpkOverheadModal.tsx` & update financial types | Antigravity | ⬜ Todo | 0.5h |
| 4. Update unit tests in `SpkBoronganPanel.test.tsx` and `SpkOverheadModal.test.tsx` | Antigravity | ⬜ Todo | 0.5h |
| 5. Regression testing, linting, build check, and sprint documentation | Antigravity | ⬜ Todo | 0.2h |

## Daily Log

### 2026-10-20
- Initialized Sprint 51: Ingest Approved Change Order Labor and Overhead Items into Mandor Workflows.
- Archived Sprint 50 to `.gsd/sprints/sprint-50-fix-material-requisition-items-foreign-key-constraint-for-change-order-items.md`.
