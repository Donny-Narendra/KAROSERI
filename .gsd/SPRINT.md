# Sprint 87 — Implement RAB Perubahan (Consolidated Estimation & Fulfillment Audit) Tab with Export Features in Service Advisor

> **Duration**: 2026-10-24 to 2026-10-24
> **Status**: In Progress

## Goal
Implement a dedicated "RAB Perubahan" consolidated tab in the Service Advisor SPK detail view that unifies original estimation contract items (`rab_items`) with all approved change order items (`change_order_items`), evaluates real-time fulfillment/warehouse issuance status across all 3 cost elements (Material warehouse issues, Labor SPK Borongan assignments, and Overhead logs), renders a 4-pillar financial margin footer, and provides Excel (.xlsx) and printable PDF realization audit exports.

## Scope

### Included
- **Task 1: Register New Navigation Tab in `ServiceAdvisorDashboard.tsx`**
  - Update `activeTab` state type to `'rab' | 'amendments' | 'rab_perubahan' | 'wbs'`.
  - Insert "RAB Perubahan" tab button between "Change Orders" and "WBS & QC".
  - Wire tab content to render `<RabPerubahanTab spkId={selectedSpkId} spk={curSpk} />`.
- **Task 2: Build `RabPerubahanTab.tsx` Component**
  - Create `src/components/service_advisor/RabPerubahanTab.tsx` (and barrel/re-export if needed).
  - Fetch `rab_items` (via `rabService.getRabItems(spkId)` or direct Supabase query with estimation/fallback).
  - Fetch approved `change_orders` and their `change_order_items` via `spkService.getChangeOrders(spkId)`.
  - Fetch warehouse physical issues (`material_issues`, approved `material_requisition_items`), labor work orders (`spk_borongan`), and overhead logs (`spk_overhead_logs`).
  - Standardize into `ConsolidatedRabItem` records:
    - Origin: `RAB` vs `Change Order`.
    - Entry Method: `Paket: <Name>` vs `Granular`.
    - Item Type: `MATERIAL`, `LABOR`, `OVERHEAD`.
    - WBS Stage: WBS 1 through WBS 5 with canonical ordering.
    - Quantity, Unit, Cost Price (HPP), Selling Price, Subtotal.
    - Fulfillment Status: `FULFILLED` vs `PENDING` with fulfilled quantity tracking.
  - Implement 4-pillar financial metrics calculation:
    - Package Profit = Σ (Jual Paket - Modal Paket)
    - Granular Material Profit = Σ (Jual Material Lepas - Modal Gudang)
    - Labor Profit = Σ (Tarif Tagih Jasa - Modal Upah Pokok)
    - Overhead Profit = Σ (Tarif Tagih FOH - Modal Biaya Riil)
    - Total Revenue, Total HPP, Total Profit, Margin %.
  - Provide filter controls: Filter Tipe (Semua/Material/Labor/Overhead), Filter Asal (Semua/RAB/Change Order), Filter Status Realisasi (Semua/Sudah Diambil/Belum Diambil), and Search keyword.
  - Render dark-themed, responsive table matching RobelKaroseri design system with informative summary cards.
- **Task 3: Implement Export XLSX & Export PDF Utilities**
  - Create `src/utils/rabPerubahanExport.ts`:
    - `exportRabPerubahanToExcel`: Generate `.xlsx` file (`RAB_Perubahan_[NoSPK]_[Nopol].xlsx`) containing project header metadata, consolidated table with formatted currency, formulas, and 4-pillar financial summary.
    - `printRabPerubahanReport`: Generate official printable HTML view with RobelKaroseri workshop header, SPK metadata, consolidated realization items, fulfillment audit breakdown, totals, and tri-party signature blocks (Service Advisor, Mandor/Gudang, Konsumen/Owner).
- **Task 4: Automated Testing & Verification**
  - Create unit and component tests in `src/components/service_advisor/__tests__/RabPerubahanTab.test.tsx` and `src/utils/__tests__/rabPerubahanExport.test.ts`.
  - Run `oxlint`, `tsc -b`, full `vitest` suite, and `npm run build`.

### Explicitly Excluded
- Modifying cashier payment processing or invoice generation logic.
- Altering database schema or writing new database migrations (existing tables and views are complete).

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| Task 1: Register "RAB Perubahan" tab in `ServiceAdvisorDashboard.tsx` | Claude | ⬜ Todo | 0.5 |
| Task 2: Build `RabPerubahanTab.tsx` consolidated component with fulfillment tracking & 4-pillar metrics | Claude | ⬜ Todo | 1.5 |
| Task 3: Build `rabPerubahanExport.ts` for XLSX export and printable PDF realization report | Claude | ⬜ Todo | 1.0 |
| Task 4: Unit tests, component tests, linting, and build verification | Claude | ⬜ Todo | 1.0 |

## Daily Log

### 2026-10-24
- Sprint created. Scope and technical architecture analyzed.
