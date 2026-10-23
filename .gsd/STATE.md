## Current Position
- **Sprint**: Sprint 83 — Add Source Origin Column to Change Order Snapshot Table in Service Advisor (Completed)
- **Status**: Sprint Completed (2026-10-24)
- **Milestone**: Core Business Recommendations Hardening — Enterprise Production Readiness (ready to resume)

## Sprint 83 Summary
- **Data & Service Layer:**
  - Updated `ChangeOrderItemRecord` in `src/types/database.ts` with `product_packages?: { id: string; name: string } | null;`.
  - Updated `spkService.getChangeOrders` in `src/services/spkService.ts` to include `product_packages(id, name)` with defensive fallback to `change_order_items(*)`.
  - Implemented and exported `getChangeOrderItemSource(item, packagesList)` in `src/components/AmendmentManager.tsx` with resolution across direct `package_name`, `product_packages` relation, `notes` prefixes/patterns, and packages list lookup.
- **Service Advisor UI (Change Order Accordion Snapshot Table):**
  - Updated `AmendmentManager.tsx` snapshot table header (`<thead>`): inserted `SUMBER / PAKET` between `ITEM TYPE` and `ALOKASI WBS`.
  - Rendered stylized badges in `<tbody>`:
    - Assembly Package Origin: `[ 📦 Paket: [Nama Paket] ]` (amber badge `bg-amber-950/70 text-amber-400 border border-amber-800/80`).
    - Granular Loose Origin: `[ 📋 Granular ]` (slate badge `bg-slate-800/80 text-slate-300 border border-slate-700/80`).
  - Adjusted empty state `colSpan` from 8 to 9.
- **Quality & Verification Status:**
  - Automated Tests: 61 test suites, 437 tests passing (100% green, +8 tests added).
  - TypeScript Static Analysis: Clean compilation with 0 errors (`tsc --noEmit`).
  - Production Build: Clean bundle generated in 410ms (`npm run build`).

## Next Up
- User verification or review.
