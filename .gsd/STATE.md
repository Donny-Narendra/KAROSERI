## Current Position
- **Sprint**: Sprint 74 — Add WBS Column and Ascending WBS Sorting to Mandor Requests and Recent Material Issues Tables
- **Status**: Sprint in progress
- **Milestone**: Core Business Recommendations Hardening — Enterprise Production Readiness (paused for sprint)

## Last Session Summary
Sprint 73 (2026-10-22):
- **Diagnosed Empty Table Root Causes**:
  1. `inventory_transactions` select query requested `created_at` which does not exist on the database table (table uses `issued_at`), causing PostgREST to respond with 400 Bad Request error and resetting the results array to empty.
  2. Joined `spk` relation and lookup queries requested `spk_number` which is not present in standard schema (only `spk_no` exists).
  3. Prop passing and resolution between UUID (`spk.id`) and string (`spk_no`) was brittle, and `ServiceAdvisorDashboard.tsx` did not pass `selectedSpkId`.
- **Refactored `RecentMaterialIssues.tsx`**:
  - Implemented tolerant multi-format SPK input extraction supporting objects (`{ id, spk_no, spk_number, spkId, spkNo }`) or strings (`selectedSpkFilter`, `selectedSpkId`, `selectedSpkNumber`).
  - Added dual resolution: auto-resolves `spk_id` UUID by querying `spk(id, spk_no)` if only SPK number was passed, and retrieves `spk_no` for display badge if only UUID was passed.
  - Removed invalid columns (`created_at` and `spk_number`) from the `inventory_transactions` query.
  - Implemented 2-stage resilient fallback: primary with full audit fields, fallback to basic fields, and secondary fallback to `material_issues` view/table.
  - In-memory fallback filtering by SPK number if database SPK record was not found by UUID.
- **Synchronized Dashboard Consumers**:
  - Updated [`ServiceAdvisorDashboard.tsx`](file:///c:/KAROSERI/src/pages/ServiceAdvisorDashboard.tsx) to compute `selectedWarehouseSpkId` and pass both `selectedSpk` and `selectedSpkId`.
  - Updated [`WarehouseDashboard.tsx`](file:///c:/KAROSERI/src/pages/WarehouseDashboard.tsx) to pass `selectedSpk` alongside `selectedSpkFilter` and `selectedSpkId`.
- **Testing & Verification**:
  - Expanded [`RecentMaterialIssues.test.tsx`](file:///c:/KAROSERI/src/components/__tests__/RecentMaterialIssues.test.tsx) from 4 to 8 tests covering object tolerance, SPK number lookup resolution, fallback to `material_issues`, and SPK-7080 data rendering (Mata Gerinda Potong 4 pcs, Amplas 150 1 lbr, Amplas 100 0.75 mtr).
  - All 55 test files (354 tests) passing.

## Quality & Verification Status
- **Linter (Oxlint):** 0 errors, 0 warnings across 194 files with 113 rules.
- **TypeScript Static Analysis:** Clean compilation with 0 errors (`tsc -b` & `tsc --noEmit`).
- **Production Build:** Clean bundle generated in 513ms (`npm run build`).

## Technical Debt Backlog
None. (Zero outstanding technical debt).

## Next Up
- Resume milestone work or start new sprint upon user direction.
