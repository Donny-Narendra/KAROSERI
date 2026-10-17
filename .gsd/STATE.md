## Current Position
- **Sprint**: Sprint 35 — Implement spk_overhead_logs and Update Financial Database Views for 3-Element Job Order Costing
- **Status**: Sprint in progress 🟡
- **Milestone**: Core Business Recommendations Hardening — Enterprise Production Readiness

## Last Session Summary
- Archived Sprint 34 to `.gsd/sprints/sprint-34-filter-material-requisition-rab-reference-to-exclusively-show-material-items.md`.
- Implemented comprehensive 3-Element Job Order Costing (Direct Material, Direct Labor, Factory Overhead) via migration `supabase/migrations/20261017010000_job_order_costing_overhead.sql`.
- Created table `public.spk_overhead_logs` with auto-computed stored amount (`frequency_qty * rate_per_unit`), RLS policies, and performance indexes.
- Updated `view_wbs_cost_variance` for 3-pillar budget variance analysis (Material, Labor, Overhead).
- Updated `view_spk_job_profitability` to incorporate `actual_overhead_cost` into `total_cogs`, `gross_profit`, and `gross_margin_percentage`, maintaining full backward compatibility.
- Updated `get_financial_executive_summary` RPC to expose `total_actual_overhead_cost` and accurate 3-element COGS.
- Updated TypeScript types, service layer, calculation formulas, Excel/CSV export mapping, and financial UI reporting tabs.
- Empirically validated with PostgreSQL database script (`verify_financial_reporting_views.cjs`), 122 Vitest unit tests, Oxlint (0 errors), and production build.

## Blockers
None.
