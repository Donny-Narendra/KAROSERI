# Sprint 52 — Exclude DRAFT Status SPK from Financial Reports and Executive Profitability Views

> **Duration**: 2026-10-20 to 2026-10-21
> **Status**: Completed ✅

## Goal
Exclude SPKs with status `DRAFT` and `PENDING_DP` from PostgreSQL financial database views (`view_spk_job_profitability`, `view_wbs_cost_variance`), executive summary RPC aggregation (`get_financial_executive_summary`), and ensure frontend views (`JobProfitabilityTab.tsx`, `WbsCostVarianceTab.tsx`, `financialReportsService.ts`) only present active, approved, and operational SPKs to prevent dirtying financial metrics and executive margin statistics.

## Scope

### Included
- **Database Migration (`supabase/migrations/20261021010000_exclude_draft_spk_from_financial_reports.sql`)**:
  - Update `public.view_spk_job_profitability` to filter `WHERE UPPER(s.status::text) NOT IN ('DRAFT', 'PENDING_DP')` while preserving all required columns (`customer_phone`, `target_date`, `payment_status`).
  - Update `public.view_wbs_cost_variance` to filter `WHERE UPPER(s.status::text) NOT IN ('DRAFT', 'PENDING_DP')` while preserving approved Change Order 3-element cost aggregations and `stages` CTE.
  - Update RPC `public.get_financial_executive_summary` to filter out `DRAFT` and `PENDING_DP` SPKs from both profitability and receivables aggregations.
- **Frontend & Service Layer Harmonization**:
  - Update `src/services/financialReportsService.ts` to add query-level (`.not('spk_status', 'in', '("DRAFT","PENDING_DP")')`) and in-memory defense filtering against `DRAFT` and `PENDING_DP` SPKs.
  - Update `src/components/finance/tabs/JobProfitabilityTab.tsx` to ensure default status filter clearly identifies operational SPKs (`Semua SPK Operasional (Non-Draft)`) and excludes draft data.
  - Update `src/components/finance/tabs/WbsCostVarianceTab.tsx` so the SPK selector dropdown excludes `DRAFT` and `PENDING_DP` SPKs at query level and in memory.
- **Automated Testing & Empirical Verification**:
  - Add test suite in `src/components/finance/tabs/__tests__/JobProfitabilityTab.test.tsx` verifying draft SPKs (`SPK-8698`) are excluded, operational SPKs render correctly, and summaries calculate accurately.
  - Add test suite in `src/services/__tests__/financialReportsService.test.ts` verifying exclusion logic and defensive layers.
  - Run database migration via `apply_migration.cjs` and empirically verify `SPK-8698` is omitted from `view_spk_job_profitability` and `total_projects` updates from 6 to 5.
  - Run full test suite (31/31 suites, 199/199 tests passing), oxlint (0 errors, 0 warnings across 151 files), typescript compiler (`npx tsc -b`), and production build.

### Explicitly Excluded
- Modifying SPK creation, draft editing, or quotation generation in Service Advisor portal.
- Changing billing or payment registration logic in Kasir Dashboard.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Create SQL database migration for `view_spk_job_profitability`, `view_wbs_cost_variance`, and `get_financial_executive_summary` | Antigravity | ✅ Done | 0.3h |
| 2. Apply migration to PostgreSQL database and empirically verify views & RPC | Antigravity | ✅ Done | 0.2h |
| 3. Update `financialReportsService.ts`, `JobProfitabilityTab.tsx`, and `WbsCostVarianceTab.tsx` | Antigravity | ✅ Done | 0.4h |
| 4. Add comprehensive unit & component tests | Antigravity | ✅ Done | 0.4h |
| 5. Regression testing, linting, build check, and sprint documentation | Antigravity | ✅ Done | 0.2h |

## Daily Log

### 2026-10-20
- Archived Sprint 51 to `.gsd/sprints/sprint-51-ingest-approved-change-order-labor-and-overhead-items-into-mandor-workflows.md`.
- Initialized Sprint 52: Exclude DRAFT Status SPK from Financial Reports and Executive Profitability Views.
- Verified empirical issue in database: `SPK-8698` (PT. Grosir Murah Kediri) with status `DRAFT` was present in `view_spk_job_profitability` and inflated `total_projects` in `get_financial_executive_summary` to 6.
- Created SQL migration `supabase/migrations/20261021010000_exclude_draft_spk_from_financial_reports.sql` with explicit `UPPER(s.status::text) NOT IN ('DRAFT', 'PENDING_DP')` casts for PostgreSQL custom enum `spk_status`, preserving all required schema columns and approved change order aggregations.
- Applied migration to Supabase PostgreSQL database using `apply_migration.cjs`.
- Empirically validated database output:
  - `view_spk_job_profitability` returns 0 rows for `SPK-8698` (properly excluded).
  - `get_financial_executive_summary()` recalculated `total_projects` from 6 down to 5 operational projects.
  - Ran `verify_financial_reporting_views.cjs`: all 5 stages passed with 100% compliance.
- Hardened frontend and service layer:
  - `src/services/financialReportsService.ts`: Added PostgREST `.not('spk_status', 'in', '("DRAFT","PENDING_DP")')` and in-memory defense filter.
  - `src/components/finance/tabs/JobProfitabilityTab.tsx`: Added in-memory defense filter and updated default dropdown label to `Semua SPK Operasional (Non-Draft)`.
  - `src/components/finance/tabs/WbsCostVarianceTab.tsx`: Filtered out `DRAFT` and `PENDING_DP` SPKs from the SPK selection dropdown.
- Created automated unit test suites:
  - `src/components/finance/tabs/__tests__/JobProfitabilityTab.test.tsx` (3 tests passing).
  - `src/services/__tests__/financialReportsService.test.ts` (1 test passing).
  - Updated `WbsCostVarianceTab.test.tsx` query mock to support `.not()` chaining (4 tests passing).
- Full regression verification:
  - Vitest: 31/31 test suites passing, 199/199 tests passing (100%).
  - Oxlint: 0 errors, 0 warnings across 151 files with 113 rules.
  - TypeScript: Clean static compilation (`npx tsc -b`).
  - Production build: Clean bundle generated in 508ms (`npm run build`).
