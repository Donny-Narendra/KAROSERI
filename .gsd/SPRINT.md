# Sprint 35 — Implement spk_overhead_logs and Update Financial Database Views for 3-Element Job Order Costing

> **Duration**: 2026-10-17 to 2026-10-17
> **Status**: In Progress 🟡

## Goal
Implement comprehensive 3-Element Job Order Costing (Direct Material, Direct Labor, Factory Overhead) by creating table `public.spk_overhead_logs`, updating `view_wbs_cost_variance` for 3-pillar budget variance analysis, updating `view_spk_job_profitability` to incorporate actual overhead costs into total COGS and accurate gross profit / margin calculations, and updating the `get_financial_executive_summary` RPC to expose real factory overhead aggregations.

## Scope

### Included
- **Database Migration (`supabase/migrations/20261017010000_job_order_costing_overhead.sql`)**:
  - Create table `public.spk_overhead_logs` with generated stored column `total_amount = frequency_qty * rate_per_unit`, RLS policies, and indexes on `spk_id` and `wbs_stage`.
  - Update `view_wbs_cost_variance` to aggregate 3 budget pillars (Material, Labor, Overhead) from `rab_items` and `change_order_items`, and compare with actual spent (`material_issues`, `spk_borongan`, `spk_overhead_logs`).
  - Update `view_spk_job_profitability` to compute 3-element HPP/COGS (`actual_material_cost + actual_labor_cost + actual_overhead_cost`), net operating profit (`gross_profit`), and `gross_margin_percentage`, maintaining backward compatibility (`payment_status`, `customer_phone`, `target_date`).
  - Update RPC `get_financial_executive_summary` to include `total_actual_overhead_cost` and accurate 3-element HPP/COGS.
- **Application Services & TypeScript Contracts**:
  - Update `src/types/financialReports.ts` (`SpkJobProfitability`, `WbsCostVariance`, `FinancialExecutiveSummary`).
  - Update `src/services/financialReportsService.ts` mapping and parsing for overhead fields.
  - Update `src/utils/financialCalculations.ts` (`calculateJobProfitability`) to support optional 4th parameter `overheadCost`.
  - Update `src/utils/exportFinancialReports.ts` to export overhead columns in Excel/CSV.
- **UI Components & Reporting Tabs**:
  - Update `JobProfitabilityTab.tsx` to display Biaya Overhead (FOH) and incorporate it into total COGS.
  - Update `WbsCostVarianceTab.tsx` to display the 3rd pillar (Pagu Overhead, Realisasi Overhead, Varian Overhead).
  - Update `ExecutiveKpiCards.tsx` to reference comprehensive 3-element COGS.
- **Testing & Verification**:
  - Apply migration to PostgreSQL database via `apply_migration.cjs`.
  - Update and execute `verify_financial_reporting_views.cjs`.
  - Run all Vitest suites (`npm test`), Oxlint (`npx oxlint`), and production build (`npm run build`).

### Explicitly Excluded
- Retroactive manual recalculations of closed invoices.
- Physical bay hardware sensors or automated check-in logging devices.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Create SQL migration `20261017010000_job_order_costing_overhead.sql` and apply to database | Antigravity | ✅ Done | 0.3h |
| 2. Update TypeScript types, service layer, calculation formulas, and export helpers | Antigravity | ✅ Done | 0.3h |
| 3. Update Financial Reporting UI tabs (`JobProfitabilityTab`, `WbsCostVarianceTab`, `ExecutiveKpiCards`, `FinancialPrintReport`) | Antigravity | ✅ Done | 0.3h |
| 4. Verification with empirical database script, unit tests, linter, and build | Antigravity | ✅ Done | 0.3h |

## Daily Log

### 2026-10-17
- Archived Sprint 34 to `.gsd/sprints/sprint-34-filter-material-requisition-rab-reference-to-exclusively-show-material-items.md`.
- Initialized Sprint 35 for 3-element Job Order Costing (Direct Material, Direct Labor, Factory Overhead).
- Created migration `supabase/migrations/20261017010000_job_order_costing_overhead.sql` with table `spk_overhead_logs`, updated views `view_wbs_cost_variance` and `view_spk_job_profitability`, and updated RPC `get_financial_executive_summary`.
- Successfully applied migration to Supabase PostgreSQL database via `apply_migration.cjs`.
- Updated TypeScript contracts in `src/types/financialReports.ts` (`SpkOverheadLog`, `SpkJobProfitability`, `WbsCostVariance`, `FinancialExecutiveSummary`).
- Updated service layer in `src/services/financialReportsService.ts` to map overhead fields and added `getSpkOverheadLogs`.
- Updated financial calculation formulas in `src/utils/financialCalculations.ts` (`calculateJobProfitability`) and added comprehensive Vitest unit tests in `src/utils/__tests__/financialCalculations.test.ts`.
- Updated export mapping in `src/utils/exportFinancialReports.ts` and test assertions in `src/utils/__tests__/exportFinancialReports.test.ts`.
- Updated UI reporting tabs (`JobProfitabilityTab.tsx`, `WbsCostVarianceTab.tsx`, `ExecutiveKpiCards.tsx`, `FinancialPrintReport.tsx`) to render Factory Overhead (FOH) and 3-element costing calculations.
- Verified empirical database validation via `verify_financial_reporting_views.cjs` (All 5 stages passed 100%).
- Ran full test suite (15 test suites, 122 tests passed), Oxlint (0 errors), and production build (`npm run build` succeeded).
