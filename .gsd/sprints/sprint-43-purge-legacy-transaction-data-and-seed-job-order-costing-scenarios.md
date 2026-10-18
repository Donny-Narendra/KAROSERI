# Sprint 43 — Purge Legacy Transaction Data and Seed Complete End-to-End Job Order Costing Scenarios

> **Duration**: 2026-10-18 to 2026-10-18
> **Status**: Completed ✅

## Goal
Purge legacy incomplete and mockup transactional records (SPK, RAB, Borongan, Requisitions, Invoices, Billing, Overhead logs) across the operational pipeline while strictly preserving the master material catalog (`materials`), product packages, and user profiles (`profiles`, `auth.users`).
Deploy migration `supabase/migrations/20261018020000_purge_and_seed_comprehensive_financial_data.sql` and seed 3 comprehensive realistic SPK business scenarios representing the end-to-end RobelKaroseri business cycle:
1. **SPK-2026-001 (Dump Truck Isuzu - Unit Selesai & Lunas / Profitable Baseline)**:
   - WBS 1 (Pembongkaran) & WBS 2 (Sasis/Rangka) with complete 3-element HPP (Material, Labor, FOH).
   - Realized warehouse goods issues, paid borongan mandor, bay overhead logs.
   - Final billing fully settled (`LUNAS`, Rp 22.000.000 revenue, Rp 15.300.000 COGS, Rp 6.700.000 gross profit, 30.45% margin, QC PASS, status COMPLETED).
2. **SPK-2026-002 (Box Pendingin Hino Dutro - WIP / Over-Budget Material Variance)**:
   - Active project with WBS 2 (Sasis/Rangka), down payment paid (`DP_PAID`, Rp 3.000.000 DP of Rp 9.000.000 contract).
   - Material over-budget scenario: budgeted 2 sheets (Rp 3.000.000), warehouse issued 3 sheets (Rp 3.600.000) -> Material variance -Rp 600.000 (red indicator in cost variance analysis & financial sanity audit).
3. **SPK-2026-003 (Potong Sasis Canter - Unit Selesai Tertahan Pelunasan / Handover Gate Risk)**:
   - Fabrication complete, QC PASS, but invoice has unpaid outstanding balance of Rp 3.000.000 (`UNPAID` status).
   - Triggers the PostgreSQL handover hard-gate (`check_spk_completion_billing_status()`), preventing completion and vehicle release until full payment is received.

## Scope

### Included
- **Schema & Constraint Resiliency**:
  - Nullability & column alignment for seamless seeding (`spk.vehicle_model`, `spk_borongan.job_description`).
  - Added enum `'PAID'` to `public.spk_borongan_status`.
  - Expanded `spk_qc_status_check` to support `'IN_PROGRESS'`.
  - Expanded `invoices_status_check` to support `'DP_PAID'` and `'PAID'`.
  - Idempotent `INSTEAD OF INSERT` triggers on views `final_billing` and `material_issues` ensuring seamless compatibility with direct view insertions and automated migration scripts.
- **Database Purge**:
  - Truncated operational tables via `TRUNCATE TABLE ... CASCADE` (`spk_overhead_logs`, `inventory_transactions`, `material_requisition_items`, `material_requisitions`, `mandor_requisitions`, `requisition_items`, `spk_borongan`, `change_order_items`, `change_orders`, `rab_items`, `rab_estimations`, `invoices`, `payments`, `qc_inspections`, `wbs_checklists`, `spk_assets`, `spk_amendments`, `spk`).
  - Master catalog `materials` (249 active items) and `profiles`/`auth.users` remain intact and unaffected.
- **Seeding & Empirical Validation**:
  - Authored `supabase/migrations/20261018020000_purge_and_seed_comprehensive_financial_data.sql`.
  - Executed migration and verified against live PostgreSQL database.
  - Verified `view_spk_job_profitability`, `view_wbs_cost_variance`, and `view_corporate_monthly_pnl`.
  - Validated service layer via `verify_financial_reporting_service.ts` across all 6 audit stages.
  - Validated handover hard-gate trigger on SPK-2026-003 with empirical rejection proof.
  - Executed complete Vitest test suite (20/20 test suites passing, 147/147 tests), Oxlint (0 warnings across 140 files), and production build.

### Explicitly Excluded
- Deleting or modifying master catalog materials (`public.materials`) or package BOM templates.
- Overriding periodic OPEX records in `operating_expenses`.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Analyze schema constraints, foreign keys, views, and generated columns | Antigravity | ✅ Done | 0.3h |
| 2. Implement resilient migration `20261018020000_purge_and_seed_comprehensive_financial_data.sql` | Antigravity | ✅ Done | 0.4h |
| 3. Apply migration to PostgreSQL via `apply_migration.cjs` and verify views | Antigravity | ✅ Done | 0.3h |
| 4. Validate service layer audit and handover lock trigger | Antigravity | ✅ Done | 0.3h |
| 5. Run full test suite, oxlint, and production build verification | Antigravity | ✅ Done | 0.2h |

## Daily Log

### 2026-10-18
- Initialized Sprint 43 to purge legacy transaction data and seed comprehensive end-to-end Job Order Costing scenarios.
- Inspected public PostgreSQL schema constraints and view dependencies:
  - Identified `final_billing` and `material_issues` as views, establishing that `TRUNCATE TABLE` must target base tables (`inventory_transactions`, `invoices`).
  - Implemented `INSTEAD OF INSERT` triggers on `final_billing` and `material_issues` to route virtual inserts to base tables while preserving audit links.
  - Identified generated columns on `spk` (`spk_number`), `rab_items` (`subtotal`, `wbs_stage`), `spk_borongan` (`total_amount`, `wbs_stage`), and `spk_overhead_logs` (`total_amount`).
  - Added enum value `'PAID'` to `spk_borongan_status` and expanded `spk_qc_status_check` (`IN_PROGRESS`) and `invoices_status_check` (`DP_PAID`, `PAID`).
- Created and executed migration `supabase/migrations/20261018020000_purge_and_seed_comprehensive_financial_data.sql`:
  - Successfully purged all legacy transaction records without altering master catalog `materials` (249 items intact).
  - Seeded SPK-2026-001 (Isuzu Giga Dump Truck, fully completed, profitable, 30.45% gross margin).
  - Seeded SPK-2026-002 (Hino Dutro Box Pendingin, WIP, active, material over-budget by Rp 600.000).
  - Seeded SPK-2026-003 (Mitsubishi Canter Potong Sasis, QC Pass, unpaid balance Rp 3.000.000).
- Validated financial reporting database views:
  - `view_spk_job_profitability`: 3 SPK records with accurate 3-element COGS, profit, and margins.
  - `view_wbs_cost_variance`: 4 WBS stage variances capturing under-budget, exact budget, and -Rp 600.000 over-budget.
  - `view_corporate_monthly_pnl`: Consolidated 3 SPK projects (Revenue Rp 36.000.000, COGS Rp 24.500.000, Gross Profit Rp 11.500.000, OPEX Rp 5.500.000, EBIT Rp 6.000.000, Net Margin 16.67%).
- Validated TypeScript service layer via `verify_financial_reporting_service.ts`:
  - All 6 stages passed 100%, correctly detecting 1 over-budget item and 1 unit pending handover.
- Verified handover hard-gate trigger on SPK-2026-003:
  - Attempting to mark SPK-2026-003 as `COMPLETED` was immediately rejected with PostgreSQL exception: *"Pelanggaran Handover Gate: Kendaraan SPK SPK-2026-003 belum dapat diserahterimakan (COMPLETED). Status pembayaran masih UNPAID, sisa tagihan belum lunas."*
- Verified full quality regression:
  - **Vitest**: 20/20 test suites passing, 147/147 tests passing (100%).
  - **Oxlint**: 0 errors, 0 warnings across 140 files.
  - **Production Build**: Clean compilation in 489ms with code splitting chunks.
