# Sprint 87 — Implement RAB Perubahan (Consolidated Estimation & Fulfillment Audit) Tab with Export Features in Service Advisor

> **Duration**: 2026-10-24 to 2026-10-24
> **Status**: Completed

## Goal
Implement a dedicated "RAB Perubahan" consolidated tab in the Service Advisor SPK detail view that unifies original estimation contract items (`rab_items`) with all approved change order items (`change_order_items`), evaluates real-time fulfillment/warehouse issuance status across all 3 cost elements (Material warehouse issues, Labor SPK Borongan assignments, and Overhead logs), renders a 4-pillar financial margin footer, and provides Excel (.xlsx) and printable PDF realization audit exports.

## Scope

### Included
- **Task 1: Register New Navigation Tab in `ServiceAdvisorDashboard.tsx`**
  - Updated `activeTab` state type to `AdvisorTab = 'rab' | 'amendments' | 'rab_perubahan' | 'wbs'`.
  - Inserted "RAB Perubahan" tab button between "Change Orders" and "WBS & QC".
  - Wired tab content to render `<RabPerubahanTab spkId={selectedSpkId} spk={curSpk} />`.
- **Task 2: Build `RabPerubahanTab.tsx` Component**
  - Created `src/components/service_advisor/RabPerubahanTab.tsx`.
  - Unified `rab_items` and approved `change_order_items` into `ConsolidatedRabItem` records.
  - Linked real-time physical fulfillment across Material (warehouse approvals/issues), Labor (SPK Borongan active/completed work orders), and Overhead (spk_overhead_logs).
  - Built 4-pillar segregated margins (Package Profit, Granular Material Profit, Labor Margin, and Overhead FOH Margin).
  - Provided live multi-filter controls (Category, Origin, Fulfillment Status, WBS stage, and keyword search).
  - Designed dark-themed RobelKaroseri responsive UI with informative summary cards.
- **Task 3: Implement Export XLSX & Export PDF Utilities**
  - Created `src/utils/rabPerubahanExport.ts`:
    - `exportRabPerubahanToExcel`: Generates structured spreadsheet `.xlsx` with project metadata, formatted columns, 4-pillar summary rows, and fulfillment status.
    - `printRabPerubahanReport`: Official printable HTML view with workshop letterhead, project info, consolidated tables with WBS grouping, warehouse absorption progress, and tri-party signature blocks.
- **Task 4: Automated Testing & Verification**
  - Created unit tests in `src/utils/__tests__/rabPerubahanExport.test.ts`.
  - Created component integration tests in `src/components/service_advisor/__tests__/RabPerubahanTab.test.tsx`.
  - Verified static typing (`tsc -b`), linter (`oxlint`), full test suite (63 suites, 462 tests passed, 100% green), and production build (`npm run build`).

### Explicitly Excluded
- Modifying cashier payment processing or invoice generation logic.
- Altering database schema or writing new database migrations (existing tables and views are complete).

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| Task 1: Register "RAB Perubahan" tab in `ServiceAdvisorDashboard.tsx` | Claude | ✅ Done | 0.5 |
| Task 2: Build `RabPerubahanTab.tsx` consolidated component with fulfillment tracking & 4-pillar metrics | Claude | ✅ Done | 1.5 |
| Task 3: Build `rabPerubahanExport.ts` for XLSX export and printable PDF realization report | Claude | ✅ Done | 1.0 |
| Task 4: Unit tests, component tests, linting, and build verification | Claude | ✅ Done | 1.0 |

## Daily Log

### 2026-10-24
- Sprint created. Scope and technical architecture analyzed.
- Task 1: Updated `ServiceAdvisorDashboard.tsx` with `AdvisorTab` type, inserted the "RAB Perubahan" tab button between "Change Orders" and "WBS & QC", and wired tab content to `RabPerubahanTab`.
- Task 2: Created `src/components/service_advisor/RabPerubahanTab.tsx` with full data fetching, consolidation of `rab_items` and approved `change_order_items`, real-time fulfillment checks for material, labor, and overhead, 4-pillar segregated margin cards, dynamic multi-attribute filters, and summary table footer.
- Task 3: Created `src/utils/rabPerubahanExport.ts` featuring `computeRabPerubahanTotals`, `exportRabPerubahanToExcel` (.xlsx generator with formatted columns and totals), and `printRabPerubahanReport` (official printable document with letterhead, WBS grouping, and 3-way sign-off).
- Task 4: Created test suites in `rabPerubahanExport.test.ts` (4 unit tests) and `RabPerubahanTab.test.tsx` (6 integration tests). Verified with `oxlint` (0 errors), `tsc -b` (0 errors), full test suite run (63 files, 462 tests passing, 100% green), and production bundle build (`npm run build`).
