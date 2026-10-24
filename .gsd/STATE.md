## Current Position
- **Sprint**: Sprint 87 — Implement RAB Perubahan (Consolidated Estimation & Fulfillment Audit) Tab with Export Features in Service Advisor
- **Status**: Sprint in progress
- **Milestone**: Core Business Recommendations Hardening — Enterprise Production Readiness (paused for sprint)

## Last Session Summary
Codebase mapping complete (/map on 2026-10-24).
- 82 components identified (11 pages, 71 operational components)
- 35 dependencies analyzed (16 production, 19 dev)
- 100 database migrations verified
- 61 test suites / 452 automated unit & component tests passing (100% green)
- 0 technical debt items found (0 code smells / 0 TODOs / clean static analysis)

## Sprint 87 Scope & Architecture
- **Tab Navigation (`ServiceAdvisorDashboard.tsx`)**:
  - Add `'rab_perubahan'` tab between Change Orders and WBS & QC.
- **Consolidated Component (`src/components/service_advisor/RabPerubahanTab.tsx`)**:
  - Data unification of contract items (`rab_items`) and approved amendment items (`change_order_items`).
  - Fulfillment check:
    - Material: `material_issues` / `material_requisition_items` (APPROVED/ISSUED).
    - Labor: `spk_borongan` (ACTIVE/COMPLETED).
    - Overhead: `spk_overhead_logs`.
  - 4-pillar financial margin footer:
    - Package profit, granular material profit, labor profit, overhead profit, grand total revenue, COGS, and profit.
- **Export Utilities (`src/utils/rabPerubahanExport.ts`)**:
  - `exportRabPerubahanToExcel`: XLSX export with columns, subtotals, fulfillment status, and 4-pillar margin summary.
  - `printRabPerubahanReport`: Official printable report with workshop letterhead, tables, warehouse fulfillment stats, and 3-way sign-off.

## Next Up
- Execute Task 1: Register Tab in `ServiceAdvisorDashboard.tsx`
- Execute Task 2: Implement `RabPerubahanTab.tsx`
- Execute Task 3: Implement `rabPerubahanExport.ts`
- Execute Task 4: Tests, Lint, and Build verification
