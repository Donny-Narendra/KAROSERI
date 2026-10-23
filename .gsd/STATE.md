## Current Position
- **Sprint**: Sprint 85 — Fix False Shared Exclusion of RAB and Change Order Labor Items in SPK Borongan Modal
- **Status**: Sprint in progress (2026-10-24)
- **Milestone**: Core Business Recommendations Hardening — Enterprise Production Readiness (paused for sprint)

## Sprint 85 Overview
Fixing false shared exclusion of RAB and Change Order labor items sharing identical names in the SPK Borongan modal (`SpkBoronganPanel.tsx`), ensuring availability filtering isolates items strictly by unique database row ID (`rab_item_id` and `change_order_item_id`) rather than text description matching.

## Next Up
- Task 1: Create idempotent SQL migration `supabase/migrations/20261024030000_add_source_ids_to_spk_borongan.sql`.
- Task 2: Implement ID-based exclusion in `SpkBoronganPanel.tsx`, `src/components/mandor/SpkBoronganModal.tsx`, and `rabItemAllocation.ts`.
- Task 3: Automated tests and validation checks.
