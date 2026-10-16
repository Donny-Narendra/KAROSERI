# Sprint 17 — Decouple Material and Labor Cost KPI Cards on Executive Dashboard (Priority 2)

> **Duration**: 2026-10-16 to 2026-10-17
> **Status**: Completed ✅

## Goal
Expose independent aggregations for Actual Material Cost (`actual_material_cost`) and Actual Labor Cost (`actual_labor_cost`) in the executive financial summary RPC (`get_financial_executive_summary`), and decouple them into dedicated, high-impact KPI summary cards on the Executive Dashboard (`ExecutiveKpiCards.tsx`), providing the workshop owner and management with instant visibility into 5 standalone core financial metrics.

## Scope

### Included
- **Wave 1: Database Migration - RPC Function Update (`supabase/migrations/20261016040000_decouple_executive_kpi_rpc.sql`)**:
  - Update `get_financial_executive_summary` PL/pgSQL RPC function.
  - Return `total_actual_material_cost` and `total_actual_labor_cost` computed from `view_spk_job_profitability`.
- **Wave 2: Service Layer & TypeScript Contracts**:
  - Update `FinancialExecutiveSummary` interface in `src/types/financialReports.ts`.
  - Update `financialReportsService.getExecutiveSummary` in `src/services/financialReportsService.ts`.
  - Update multi-sheet Excel export helper (`src/utils/exportFinancialReports.ts`) and PDF print view (`src/components/finance/FinancialPrintReport.tsx`).
- **Wave 3: Executive UI KPI Cards Redesign (`src/components/finance/ExecutiveKpiCards.tsx`)**:
  - Redesign top row into 5 dedicated executive cards:
    1. Total Omzet SPK (Revenue)
    2. Total Biaya Aktual Bahan Baku (Goods Issued)
    3. Total Biaya Borongan Mandor Terbayar
    4. Estimasi Laba Operasional (Gross Profit) & Margin %
    5. Total Piutang & Unit Tertahan Pelunasan
  - Add proportion badges (% dari Omzet) for Material and Labor costs.
  - Add responsive grid layout and loading skeletons.
- **Wave 4: Vitest Test Suite & Verification**:
  - Add test coverage for KPI calculations and service data transformation in `src/utils/__tests__/executiveKpiCalculations.test.ts`.
  - Run `npm test`, `npm run lint`, and `npm run build`.

### Explicitly Excluded
- Modifying underlying calculation logic in `view_spk_job_profitability` (view logic is already validated).
- Modifying SPK billing or operational state machines.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Create SQL Migration `20261016040000_decouple_executive_kpi_rpc.sql` | Antigravity | ✅ Done | 0.2h |
| 2. Update TypeScript Contracts & Financial Service Layer | Antigravity | ✅ Done | 0.2h |
| 3. Redesign `ExecutiveKpiCards.tsx` with 5 standalone financial cards | Antigravity | ✅ Done | 0.4h |
| 4. Update Export & Print Documents with decoupled metrics | Antigravity | ✅ Done | 0.2h |
| 5. Create Vitest Test Suite for Decoupled KPI Calculations | Antigravity | ✅ Done | 0.3h |
| 6. Verify Tests, Lint, and TypeScript Production Build | Antigravity | ✅ Done | 0.2h |

## Daily Log

### 2026-10-16
- Initialized Sprint 17 to decouple material and labor cost KPI cards on the Executive Dashboard.
- Archived Sprint 16 to `.gsd/sprints/sprint-16-enforce-postgresql-hard-gate-trigger-for-spk-billing-handover-lock.md`.
- Implemented `supabase/migrations/20261016040000_decouple_executive_kpi_rpc.sql` exposing `total_actual_material_cost` and `total_actual_labor_cost`.
- Updated `FinancialExecutiveSummary` in `src/types/financialReports.ts` and `financialReportsService.ts`.
- Updated multi-sheet Excel export helper (`exportFinancialReports.ts`) and PDF report canvas (`FinancialPrintReport.tsx`).
- Redesigned `src/components/finance/ExecutiveKpiCards.tsx` into 5 high-impact, standalone cards with ratio badges and responsive layout.
- Created unit test suite `src/utils/__tests__/executiveKpiCalculations.test.ts` (5 tests passing).
- Verified full test suite (`npm test`: 41 tests passing across 4 files).
- Verified linting (`npm run lint`: 0 errors).
- Verified build (`npm run build`: bundled cleanly with 0 errors).
- Updated `.gsd/ARCHITECTURE.md` resolving the Executive KPI COGS breakdown technical debt item.
