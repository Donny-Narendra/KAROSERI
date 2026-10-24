## Current Position
- **Sprint**: Sprint 86 — Fix Default WBS 2 Allocation Initial Value to Zero in Change Order Material Form
- **Status**: Sprint in progress
- **Milestone**: Core Business Recommendations Hardening — Enterprise Production Readiness (paused for sprint)

## Sprint 85 Summary
- **Database & Data Layer:**
  - Guaranteed `rab_item_id` and `change_order_item_id` foreign keys and indices in `spk_borongan` via idempotent migration `supabase/migrations/20261024030000_add_source_ids_to_spk_borongan.sql`.
  - Refactored `src/utils/rabItemAllocation.ts` `isRabItemAllocated` so assignments with explicit `change_order_item_id` or `rab_item_id` strictly match their corresponding source rows and never cross-contaminate identically named items.
- **Mandor SPK Borongan UI (`SpkBoronganPanel.tsx` & `src/components/mandor/SpkBoronganModal.tsx`):**
  - Updated selection handler `handleSelectLaborItem` to track item origin (`id`, `isChangeOrder`, `name`, `rate`).
  - Updated submission payload `handleCreate` to persist explicit `rab_item_id` (for RAB labor) or `change_order_item_id` (for Change Order labor).
  - Rebuilt availability filtering in `availableLaborItems` via `useMemo` using ID sets (`assignedRabItemIds` and `assignedCoItemIds`), eliminating mutual false exclusion of identically named items between RAB and Change Orders.
- **Quality & Verification Status:**
  - Automated Tests: 61 test suites, 449 tests passing (100% green, +4 tests added).
  - TypeScript Static Analysis: Clean compilation with 0 errors (`tsc -b`).
  - Linter Check: 0 errors (`npx oxlint`).
  - Production Build: Clean bundle generated (`npm run build`).

## Next Up
- User verification or review.
