## Current Position
- **Sprint**: Sprint 82 — Comprehensive Profit Segregation (Assembly Package vs Granular Items) across RAB, Change Orders, and Financial Reports (In Progress)
- **Status**: Sprint in progress; Task 1 (Database Migration & Reporting View Layer)
- **Milestone**: Core Business Recommendations Hardening — Enterprise Production Readiness (paused for Sprint 82)

## Last Session Summary
- Archived Sprint 81 (`.gsd/sprints/sprint-81-allow-multi-instance-package-selection-in-change-orders.md`).
- Initialized Sprint 82 with comprehensive 6-task scope:
  1. SQL migration for segregated package vs granular profit in `view_spk_job_profitability` (RAB + approved CO union).
  2. Financial reporting service layer, types, and exporters update.
  3. `JobProfitabilityTab.tsx` UI columns and footer aggregates.
  4. `RabCalculator.tsx` financial summary sub-breakdown cards.
  5. `AmendmentManager.tsx` financial summary sub-breakdown cards.
  6. Unit and integration tests, quality gates verification.

## Quality & Verification Status
- **TypeScript Static Analysis:** Clean compilation with 0 errors (`tsc -b`).
- **Production Build:** Clean bundle generated in 422ms (`npm run build`).
- **Linter:** 0 errors, 0 warnings (`oxlint`).
- **Automated Tests:** 60 test suites, 420 tests passing (100% green).

## Next Up
- Execute Task 1: Create SQL migration `20261024020000_segregate_package_and_granular_profit.sql`.
- Execute Task 2: Update types, service layer, and export utilities.
- Execute Task 3: Update `JobProfitabilityTab.tsx`.
- Execute Task 4: Update `RabCalculator.tsx`.
- Execute Task 5: Update `AmendmentManager.tsx`.
- Execute Task 6: Testing & Quality Gates.
