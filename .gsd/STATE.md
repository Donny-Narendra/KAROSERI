## Current Position
- **Sprint**: Sprint 87 — Implement RAB Perubahan (Consolidated Estimation & Fulfillment Audit) Tab with Export Features in Service Advisor
- **Status**: Sprint in progress (All tasks implemented & verified)
- **Milestone**: Core Business Recommendations Hardening — Enterprise Production Readiness (paused for sprint)

## Last Session Summary
Codebase mapping complete (/map on 2026-10-24).
- 83 components identified (11 pages, 72 operational components)
- 35 dependencies analyzed (16 production, 19 dev)
- 100 database migrations verified
- 63 test suites / 462 automated unit & component tests passing (100% green)
- 0 technical debt items found (0 code smells / 0 TODOs / clean static analysis)

## Sprint 87 Summary
- **Navigation Tab Integration (`ServiceAdvisorDashboard.tsx`):**
  - Registered `AdvisorTab = 'rab' | 'amendments' | 'rab_perubahan' | 'wbs'`.
  - Added "RAB Perubahan" tab button between "Change Orders" and "WBS & QC" with active indicator `border-amber-500 text-amber-400 bg-amber-500/10`.
  - Rendered `<RabPerubahanTab spkId={selectedSpkId} spk={curSpk} />`.
- **Consolidated Component (`src/components/service_advisor/RabPerubahanTab.tsx`):**
  - Unifies initial contract items (`rab_items`) and approved amendment items (`change_order_items` from `APPROVED` change orders).
  - Evaluates fulfillment status across all 3 elements:
    - Material: `material_issues` and approved/issued `material_requisitions` (`[ ✅ Sudah Diambil ]` vs `[ ⏳ Belum Diambil ]`).
    - Labor: active/completed `spk_borongan` (`[ ✅ Terbit SPK-B ]` vs `[ ⏳ Belum Terbit ]`).
    - Overhead: `spk_overhead_logs` (`[ ✅ Dicatat FOH ]` vs `[ ⏳ Belum Dicatat ]`).
  - Implements 4-pillar margin separation:
    - Package profit (`Σ (Jual Paket - Modal Paket)`), Granular material profit (`Σ (Jual Material Lepas - Modal Gudang)`), Labor margin (`Σ (Tarif Jasa - Upah Borongan)`), and Overhead margin (`Σ (Tarif FOH - Biaya Riil)`).
  - Provides instant multi-filter controls (Type, Origin, Fulfillment Status, WBS Stage, and Search text).
- **Export Utilities (`src/utils/rabPerubahanExport.ts`):**
  - `exportRabPerubahanToExcel`: Creates formatted `.xlsx` workbook (`RAB_Perubahan_[NoSPK]_[Nopol].xlsx`) with column auto-widths, formatted financial values, and 4-pillar summaries.
  - `printRabPerubahanReport`: Clean printable HTML layout with RobelKaroseri official letterhead, WBS grouped table, warehouse absorption progress, and 3-way sign-off blocks.
- **Verification & Quality Gates:**
  - Automated Tests: 63 test suites, 462 tests passed (100% green, +10 new tests added).
  - TypeScript Static Analysis: 0 errors (`tsc -b`).
  - Linter Check: 0 errors (`oxlint`).
  - Production Build: Clean bundle compiled (`npm run build`).

## Next Up
- User verification or review.
