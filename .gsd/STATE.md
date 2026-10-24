## Current Position
- **Sprint**: Sprint 91 — Deduplicate Rab Items and Enforce Client and Query-Level Uniqueness
- **Status**: Sprint in progress
- **Milestone**: Core Business Recommendations Hardening — Enterprise Production Readiness (paused for sprint)

## Last Session Summary
- Sprint 90 completed and archived to `.gsd/sprints/sprint-90-implement-itemized-assembly-package-vs-granular-profit-segregation-in-rab-perubahan-and-job-profitability.md`.
- Sprint 91 initialized: Deduplicate Rab Items and Enforce Client and Query-Level Uniqueness.
- Clean up duplicate `rab_items` rows in PostgreSQL, implement composite key deduplication at service and component levels, and install mutation lock / debounce in `RabCalculator.tsx` and `PackageAllocationModal.tsx`.

## Next Up
- Task 1: Create SQL migration `20261024050000_deduplicate_rab_items.sql`
- Task 2: Create pure deduplication utility `rabDeduplication.ts` with unit tests and integrate into `rabService.ts`
- Task 3: Enforce client-level deduplication in `RabCalculator.tsx` and `RabPerubahanTab.tsx`
- Task 4: Implement mutation lock and click debounce in `PackageAllocationModal.tsx` and `RabCalculator.tsx`
- Task 5: Automated testing, verification, lint check, and production build
