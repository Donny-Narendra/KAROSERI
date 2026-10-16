## Current Position
- **Sprint**: Sprint 17 — Decouple Material and Labor Cost KPI Cards on Executive Dashboard (Priority 2)
- **Status**: Sprint completed ✅
- **Milestone**: Core Business Recommendations Hardening — Revenue & Executive Analytics [COMPLETED]

## Last Session Summary
Decoupling of Material Cost and Labor Cost Executive KPI Cards Complete (2026-10-16).
- **Database Migration**: `supabase/migrations/20261016040000_decouple_executive_kpi_rpc.sql`
  - Function: `get_financial_executive_summary`
  - Returns: `total_actual_material_cost` and `total_actual_labor_cost` alongside `total_cogs`, `total_revenue`, `total_gross_profit`, `average_gross_margin`, etc.
- **Service & Contracts**:
  - `src/types/financialReports.ts`: Added `total_actual_material_cost` and `total_actual_labor_cost` to `FinancialExecutiveSummary`.
  - `src/services/financialReportsService.ts`: Extracted and normalized both fields in `getExecutiveSummary`.
  - `src/utils/exportFinancialReports.ts`: Added both KPIs to the executive summary sheet in full workbook exports.
  - `src/components/finance/FinancialPrintReport.tsx`: Added Biaya Material and Biaya Borongan Mandor columns in the executive summary print table.
- **Executive UI Redesign**:
  - `src/components/finance/ExecutiveKpiCards.tsx`: Redesigned top row into 5 dedicated standalone cards:
    1. Total Omzet SPK (Revenue)
    2. Total Biaya Aktual Bahan Baku (Goods Issued) with `% dari Omzet` indicator
    3. Total Biaya Borongan Mandor Terbayar with `% dari Omzet` indicator
    4. Estimasi Laba Operasional (Gross Profit) & Margin % badge with Total HPP note
    5. Total Piutang & Unit Tertahan Pelunasan
- **Verification**:
  - `npm test`: 41 Vitest tests passing (4/4 test files).
  - `npm run lint`: Oxlint 0 errors across 103 files.
  - `npm run build`: `tsc -b && vite build` bundled cleanly with 0 TypeScript errors.
- **Documentation**: Updated `.gsd/ARCHITECTURE.md` resolving the Executive KPI COGS breakdown technical debt item.

## Blockers
None.

## Recommended Follow-up Actions
1. **Component-Level Testing**: Implement React Testing Library tests for key workflow forms (`RabCalculator.tsx`, `GoodsIssueForm.tsx`, `KasirDashboard.tsx`).
2. **Orphaned Dependencies Cleanup**: Clean up obsolete Express/pg backend dependencies in `package.json` since architecture is fully client-first with Supabase.
