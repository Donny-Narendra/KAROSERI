# Sprint 73 — Fix Empty Recent Material Issues Table in Warehouse and Service Advisor

> **Duration**: 2026-10-22 to 2026-10-23
> **Status**: Completed

## Goal
Fix the empty "Recent Material Issues" table in `/warehouse` and `/service-advisor` by implementing resilient dual-parameter SPK matching (`spk_id` UUID and `spk_no` string/object), eliminating non-existent column queries (`created_at` on `inventory_transactions` and `spk_number` on `spk`), and ensuring physical goods issue records (including SPK-7080) reliably load and display.

## Scope

### Included
- Refactor `RecentMaterialIssues.tsx` parameter extraction to tolerate objects (`selectedSpk = { id, spk_no }`) and strings (`selectedSpkFilter`, `selectedSpkId`, `selectedSpkNumber`).
- Ensure `RecentMaterialIssues.tsx` resolves `targetSpkId` via UUID check or querying `spk(id, spk_no)` safely without requesting `spk_number`.
- Clean up `inventory_transactions` select clause to remove non-existent `created_at` and `spk_number` fields that triggered PostgREST 400 Bad Request errors.
- Add resilient fallback querying (primary `inventory_transactions` with full audit fields, fallback with basic columns, and fallback to `material_issues` view/table if applicable).
- Update `ServiceAdvisorDashboard.tsx` and `WarehouseDashboard.tsx` to pass both SPK filter identifiers to `RecentMaterialIssues`.
- Update and add comprehensive tests in `RecentMaterialIssues.test.tsx` and integration tests.

### Explicitly Excluded
- Modifying backend migration files or altering database constraints.
- Changing business logic for approval workflows or Gate 2 checks.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Refactor SPK filter extraction & queries in `RecentMaterialIssues.tsx` | Antigravity | ✅ Done | 1h |
| 2. Align prop passing in `WarehouseDashboard.tsx` and `ServiceAdvisorDashboard.tsx` | Antigravity | ✅ Done | 0.5h |
| 3. Add tests for dual-matching and fallback queries in `RecentMaterialIssues.test.tsx` | Antigravity | ✅ Done | 0.5h |
| 4. Verification and quality checks (Vitest, Oxlint, TypeScript, Build) | Antigravity | ✅ Done | 0.5h |

## Daily Log

### 2026-10-22
- Sprint 73 created.
- Diagnosed root causes for empty "Recent Material Issues" table:
  1. `inventory_transactions` query attempted to select `created_at` which does not exist on the base table (only `issued_at` exists). PostgREST threw 400 Bad Request, causing query failure and resetting issues to empty list.
  2. `spk` relation and lookup queries attempted to select `spk_number` which is not present in standard schema (only `spk_no` exists).
  3. SPK parameter handling was sensitive to whether UUID or SPK number string was passed, and `ServiceAdvisorDashboard.tsx` did not pass `selectedSpkId`.
- Refactored `RecentMaterialIssues.tsx`:
  - Added multi-type prop support (`selectedSpk`, `selectedSpkFilter`, `selectedSpkId`, `selectedSpkNumber`).
  - Added object extraction for `{ id, spk_no, spk_number, spkId, spkNo }` and string UUID vs SPK number detection.
  - Implemented dual resolution: looks up `spk` by `spk_no` if only number is provided, and retrieves `spk_no` for badge display if only UUID is provided.
  - Removed non-existent fields (`created_at` and `spk_number`) from the `inventory_transactions` select query.
  - Added 2-tier resilient fallback: primary with full audit fields, fallback to basic fields, and secondary fallback to `material_issues` view/table.
  - Added in-memory fallback filter if SPK number is chosen but UUID could not be resolved.
- Updated `ServiceAdvisorDashboard.tsx`:
  - Computed `selectedWarehouseSpkId` from `spkFilterList` / `selectedSpkFilter`.
  - Passed both `selectedSpk={selectedSpkFilter}` and `selectedSpkId={selectedWarehouseSpkId}` to `<RecentMaterialIssues />`.
- Updated `WarehouseDashboard.tsx`:
  - Passed `selectedSpk={selectedSpkFilter}` alongside `selectedSpkFilter` and `selectedSpkId`.
- Expanded `RecentMaterialIssues.test.tsx` test suite from 4 to 8 tests:
  - Added tests for object SPK prop (`{ id: 'spk-uuid-7080', spk_no: 'SPK-7080' }`).
  - Added tests for SPK number string lookup resolution without UUID.
  - Added tests specifically verifying SPK-7080 items (Mata Gerinda Potong 4 pcs, Amplas 150 1 lbr, Amplas 100 0.75 mtr).
  - Added tests verifying graceful fallback to `material_issues` if `inventory_transactions` fails.
- Validation and Quality Verification:
  - Vitest: 55 test files passed, 354 tests passed (0 failures).
  - Oxlint: 0 warnings, 0 errors across 194 files.
  - TypeScript compilation (`tsc -b` and `tsc --noEmit`): 0 errors.
  - Production build: Clean bundle generated in 513ms.
