# Sprint 12 — Implement Financial Reporting UI Module & Executive Dashboard (Step 3)

> **Duration**: 2026-10-16 to 2026-10-16
> **Status**: In Progress

## Goal
Build a comprehensive, dark-mode financial reporting dashboard interface for Owner, Admin, and Kasir featuring executive KPI summary cards, four specialized report tabs (Job Profitability, WBS Variance, Inventory Valuation, Receivables Aging), global date/search filtering, and role-guarded routing.

## Scope

### Included
- **Wave 1: Executive KPI Summary Cards (`src/components/finance/ExecutiveKpiCards.tsx`)**:
  - Total Revenue (`total_revenue`) formatted in IDR currency.
  - Total HPP / COGS (`total_cogs`) combining actual material and labor expenses.
  - Average Gross Margin (`average_gross_margin`) with dynamic color badges (Green $\ge 25\%$, Amber $10-24\%$, Red $< 10\%$).
  - Warehouse Inventory Asset Valuation (`total_inventory_valuation` and market value).
  - Outstanding Receivables (`total_outstanding_receivables`) paired with pending handover units count (`units_pending_handover`).
  - Skeleton loading states and clean dark mode styling (`bg-surface`, `border-border`, etc.).
- **Wave 2: Four Specialized Report Tab Components (`src/components/finance/tabs/`)**:
  - `JobProfitabilityTab.tsx`: Table showing SPK No, Customer, Plate, Date, Revenue, Material Cost, Labor Cost, Gross Profit, Margin %, and Payment Status with margin profitability indicators.
  - `WbsCostVarianceTab.tsx`: SPK selector dropdown, WBS stage breakdown (Stages 1-5), Material budget vs actual with variance (+/-), Labor budget vs actual with variance (+/-), and surplus (green) vs overbudget (red) highlights.
  - `InventoryValuationTab.tsx`: Category filter, text search, table of material code/name, category, physical stock, unit, HPP cost, standard selling price, total HPP valuation, market value, and accumulated footer totals.
  - `ReceivablesAgingTab.tsx`: Outstanding only toggle, table of SPK & Plate, Customer & Phone, Billing, DP Paid, Outstanding Balance, Aging Days, Clearance Status (`LUNAS (SIAP HANDOVER)` vs `UNIT SELESAI (TERTAHAN PELUNASAN)`), and direct WhatsApp billing action button (`wa.me`).
- **Wave 3: Main Page & Routing Integration**:
  - `src/pages/FinancialReportsPage.tsx`: Full executive dashboard view integrating global date filter, search box, data refresh, tab switching, and CSV export.
  - `src/App.tsx`: Route `/finance-reports` protected for `owner` and `kasir`.
  - Navigation links in `AdminDashboardPage.tsx` and `KasirDashboard.tsx`.
- **Empirical Validation & Quality Gates**:
  - Verification of all components and data bindings.
  - TypeScript compilation (`npm run build`) and linting (`npm run lint`).

### Explicitly Excluded
- Modifying underlying PostgreSQL views or RPC functions (completed in Steps 1 & 2).

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Build `ExecutiveKpiCards.tsx` with 5 metrics & skeleton states | Antigravity | ⬜ Todo | 0.3h |
| 2. Build `JobProfitabilityTab.tsx` with profitability indicator & filters | Antigravity | ⬜ Todo | 0.4h |
| 3. Build `WbsCostVarianceTab.tsx` with SPK selector & variance color badges | Antigravity | ⬜ Todo | 0.4h |
| 4. Build `InventoryValuationTab.tsx` with category filters & footer aggregates | Antigravity | ⬜ Todo | 0.3h |
| 5. Build `ReceivablesAgingTab.tsx` with clearance badges & WhatsApp action | Antigravity | ⬜ Todo | 0.4h |
| 6. Assemble `FinancialReportsPage.tsx` with date range, search & tab switcher | Antigravity | ⬜ Todo | 0.5h |
| 7. Integrate route `/finance-reports` in `App.tsx` & add navigation buttons | Antigravity | ⬜ Todo | 0.2h |
| 8. Verify TypeScript build (`npm run build`) and linter (`npm run lint`) | Antigravity | ⬜ Todo | 0.2h |

## Daily Log

### 2026-10-16
- Archived Sprint 11 to `.gsd/sprints/sprint-11-implement-financial-reporting-service-layer.md`.
- Initialized Sprint 12 for Financial Reporting UI Module & Executive Dashboard (Step 3).
