# Sprint 13 — Implement Automated Financial Reconciliation and Data Integrity Audit (Step 4)

> **Duration**: 2026-10-16 to 2026-10-16
> **Status**: In Progress 🟡

## Goal
Implement automated financial reconciliation and data integrity audit (Step 4) to detect and alert on financial anomalies (over-budget SPK, negative margin projects, unbilled completed SPKs, handover breach risks) through a PostgreSQL audit RPC, service layer integration, a visual interactive "Audit & Rekonsiliasi Integritas" panel in `/finance-reports`, and a Vitest automated unit test suite.

## Scope

### Included
- **Task 1: Database Migration (`supabase/migrations/20261016_financial_sanity_check_rpc.sql`)**:
  - Deploy stored procedure `audit_financial_sanity_check()` returning JSON report with:
    - `is_healthy` boolean flag.
    - `over_budget_count` & `over_budget_items` (SPK with `actual_material_spent > total_material_budget`).
    - `negative_margin_count` & `negative_margin_items` (SPK with `total_revenue > 0 AND gross_profit < 0`).
    - `unbilled_completed_count` & `unbilled_completed_items` (SPK with `qc_status = 'PASS'` without `final_billing`).
    - `critical_receivables_count` & `critical_receivables_items` (SPK with `handover_clearance_status = 'UNIT SELESAI (TERTAHAN PELUNASAN)'` and `receivable_aging_days > 7`).
  - Grant execute privileges to authenticated users.
- **Task 2: Service Layer & TypeScript Types**:
  - Extend `src/types/financialReports.ts` with `FinancialSanityCheckResult`, `OverBudgetAnomaly`, `NegativeMarginAnomaly`, `UnbilledCompletedAnomaly`, `CriticalReceivableAnomaly`.
  - Add `auditFinancialSanityCheck()` method to `src/services/financialReportsService.ts`.
- **Task 3: Visual Audit Panel Component (`src/components/finance/FinancialAuditPanel.tsx`)**:
  - Prominent status alert banner (Green if `is_healthy === true`, Red/Amber if anomalies detected).
  - Summary metrics chips with badges for each anomaly type.
  - Collapsible drill-down tabs/lists showing details of affected SPKs with monetary values and quick actions (view/navigate).
  - Refresh button to re-run the sanity check on demand.
- **Task 4: UI Dashboard Integration (`src/pages/FinancialReportsPage.tsx`)**:
  - Integrate `FinancialAuditPanel` above the report tabs.
  - Add quick status pill / warning badge in the header/tab bar.
- **Task 5: Vitest Setup & Automated Unit Tests**:
  - Install and configure `vitest` in `package.json`.
  - Implement comprehensive calculation test suite in `src/utils/__tests__/financialCalculations.test.ts` testing:
    - Gross Profit & Margin % calculations (standard, negative margin, zero revenue edge cases).
    - Change Order budget additions & revision handling.
    - WBS budget vs actual variance calculations (surplus vs deficit).
    - Receivables aging and handover clearance rules.
- **Task 6: Empirical Validation & Quality Gates**:
  - Run database migration and test RPC via live test script.
  - Run `npm test` (Vitest unit tests) with 100% pass.
  - Run `npm run build` (TypeScript compilation).
  - Run `npm run lint` (`oxlint`).

### Explicitly Excluded
- Modifying underlying historical invoice or transaction records.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Create and apply migration `20261016_financial_sanity_check_rpc.sql` | Antigravity | ⬜ Todo | 0.3h |
| 2. Add types & `auditFinancialSanityCheck()` to service layer | Antigravity | ⬜ Todo | 0.3h |
| 3. Create `FinancialAuditPanel.tsx` component | Antigravity | ⬜ Todo | 0.5h |
| 4. Integrate `FinancialAuditPanel` into `FinancialReportsPage.tsx` | Antigravity | ⬜ Todo | 0.3h |
| 5. Install `vitest` and implement unit test suite `financialCalculations.test.ts` | Antigravity | ⬜ Todo | 0.5h |
| 6. Run automated tests, build check & lint check | Antigravity | ⬜ Todo | 0.2h |

## Daily Log

### 2026-10-16
- Archived Sprint 12 to `.gsd/sprints/sprint-12-implement-financial-reporting-ui-module.md`.
- Initialized Sprint 13 for Automated Financial Reconciliation and Data Integrity Audit (Step 4).
