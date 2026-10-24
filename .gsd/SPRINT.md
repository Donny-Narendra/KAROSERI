# Sprint 92 — Fix Missing actual_material_cost and gross_margin_percentage in Financial Reporting Views and RPC

> **Duration**: 2026-10-24 to 2026-10-24
> **Status**: Completed

## Goal
Restore backward-compatible aliases `actual_material_cost`, `actual_labor_cost`, `actual_overhead_cost`, and `gross_margin_percentage` to PostgreSQL view `view_spk_job_profitability`, and ensure RPC `get_financial_executive_summary` and financial audit sanity checks handle draft and empty SPK states safely without throwing column errors on `/finance-reports`.

## Scope

### Included
- **Task 1: SQL Database Migration (`supabase/migrations/20261024060000_fix_financial_view_columns.sql`)**
  - Update `public.view_spk_job_profitability` to provide aliases:
    - `actual_material_cost` (alias of `granular_mat_cogs`)
    - `actual_labor_cost` (alias of `granular_labor_cogs`)
    - `actual_overhead_cost` (alias of `granular_foh_cogs`)
    - `gross_margin_percentage` (calculated gross margin % with div-by-zero guard)
  - Ensure `public.view_corporate_monthly_pnl` is recreated cleanly.
  - Update `public.get_financial_executive_summary` RPC with null-safe handling and COALESCE fallbacks for zero active SPK records.
  - Grant permissions to `authenticated` and `anon`.
- **Task 2: Service Layer Verification & Fallback (`src/services/financialReportsService.ts`)**
  - Verify `getExecutiveSummary()`, `getJobProfitability()`, and `getSanityAudit()` work with restored columns.
  - Apply clean zero (`0`) default fallbacks on summary and sanity audit responses when database returns empty/null.
- **Task 3: Automated Testing & Verification**
  - Verify service and component unit tests pass.
  - Verify `npx oxlint` (0 errors) and `npm run build` pass cleanly.

### Explicitly Excluded
- Changing business logic of package vs granular profit segregation in calculations.
- Modifying unrelated SPK registration or cashier workflows.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| Task 1: Create SQL migration `20261024060000_fix_financial_view_columns.sql` | Claude | ✅ Done | 0.25 |
| Task 2: Service layer verification & zero fallback in `financialReportsService.ts` | Claude | ✅ Done | 0.25 |
| Task 3: Automated testing, lint check, and production build | Claude | ✅ Done | 0.25 |

## Daily Log

### 2026-10-24
- Sprint 91 archived to `.gsd/sprints/sprint-91-deduplicate-rab-items-and-enforce-client-and-query-level-uniqueness.md`.
- Sprint 92 initialized: Fix Missing actual_material_cost and gross_margin_percentage in Financial Reporting Views and RPC.
- Root cause identified: Migration `20261024040000_update_job_profitability_package_breakdown.sql` isolated package breakdown but dropped legacy columns `actual_material_cost`, `actual_labor_cost`, `actual_overhead_cost`, and `gross_margin_percentage`, causing RPC `get_financial_executive_summary` and `audit_financial_sanity_check` to fail.
- Task 1: Created `supabase/migrations/20261024060000_fix_financial_view_columns.sql` restoring `actual_material_cost`, `actual_labor_cost`, `actual_overhead_cost`, and `gross_margin_percentage` to `view_spk_job_profitability`, recreating `view_corporate_monthly_pnl`, and updating `get_financial_executive_summary` and `audit_financial_sanity_check` RPCs with null safety.
- Task 2: Verified service layer in `src/services/financialReportsService.ts` with safe null fallbacks on `getExecutiveSummary()` and `getSanityAudit()`, returning clean 0 values when database has no active SPKs.
- Task 3: Added unit tests in `src/services/__tests__/financialReportsService.test.ts` and `src/components/finance/__tests__/FinancialAuditPanel.test.tsx`. Ran 70 vitest test files (497 tests passed, 100% green), verified `npx oxlint` (0 errors), and verified production build `npm run build` (423ms).
