# Sprint 24 — Implement Labor/Jasa Item Entry Toggle in Service Advisor RAB Calculator

> **Duration**: 2026-10-17 to 2026-10-17
> **Status**: Completed ✅

## Goal
Add an intuitive Labor/Jasa item entry toggle in `RabCalculator.tsx` with dedicated fields (Name, WBS Stage 1-5 dropdown, Estimated Cost, Scope/Notes) so Service Advisors can budget labor costs per WBS stage directly without material dependencies or complex allocation matrices.

## Scope

### Included
- **Schema & Type Alignment**:
  - Add optional `unit` and `notes` to `public.rab_items` and update TypeScript interface `RabItemRecord` in `src/types/database.ts`.
  - Migration script: `supabase/migrations/20261017010000_add_unit_notes_to_rab_items.sql`.
- **Toggle Mode Input Item (`RabCalculator.tsx`)**:
  - Clear segmented toggle switch above item form:
    - "Bahan Baku (Material)" (Default)
    - "Jasa / Tukang (Labor)"
    - "Overhead" (retained for workshop bay overheads)
- **Dedicated Form for Jasa / Tukang**:
  - Nama Jasa / Pekerjaan Tukang (`text` input, required, placeholder: *"misal: Jasa Tukang Las Sasis, Ongkos Borongan Dempul & Cat, Jasa Bongkar"*)
  - Tahapan WBS (`select` dropdown: `WBS 1: Pembongkaran`, `WBS 2: Sasis/Rangka`, `WBS 3: Dinding/Fabrikasi`, `WBS 4: Pengecatan`, `WBS 5: Kelistrikan/Hidrolik`)
  - Estimasi Biaya Jasa / Upah (Rp) (`number` input, required, with currency formatting and terbilang display)
  - Catatan / Scope Pekerjaan (`textarea` optional, placeholder: *"Keterangan ruang lingkup pekerjaan tukang..."*)
  - Submit button: "Tambah Jasa ke RAB" (or "Update Jasa ke RAB" in edit mode)
- **Payload & Database Persistence**:
  - `item_type = 'LABOR'`, `material_id = null`, `quantity = 1`, `unit = 'lot'`, `unit_price = cost`, `cost_price = cost`, `subtotal = cost`, `wbs_category = stage`, `notes = notes`.
  - Mutate state and persist to Supabase `rab_items` and `rab_estimations`.
- **Estimation Table & Summary**:
  - Badges: `[ MATERIAL ]` (cyan/blue) and `[ JASA / TUKANG ]` (orange/amber).
  - Hide inventory stock / waste factor on labor items.
  - Ringkasan Pagu Biaya per Tahapan WBS (Material, Jasa, Total) in estimation summary.
- **Verification & Testing**:
  - Component tests in `src/components/__tests__/RabCalculatorLabor.test.tsx` (6 tests).
  - Empirical database verification script confirming record schema and view integration.
  - Validated with `npm test` (85/85 passed), `npm run lint` (0 errors), and `npm run build` (success).

### Explicitly Excluded
- Modifying SPK billing or handover lock triggers.
- Modifying Mandor QC inspection workflows.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Align schema & types (`unit`, `notes` in `rab_items` & `database.ts`) | Antigravity | ✅ Done | 0.2h |
| 2. Implement toggle switch & dedicated Labor form in `RabCalculator.tsx` | Antigravity | ✅ Done | 0.5h |
| 3. Connect labor payload submission & editing to state & Supabase upsert | Antigravity | ✅ Done | 0.3h |
| 4. Update estimation table badges (`[ MATERIAL ]`, `[ JASA / TUKANG ]`) & WBS cost summary | Antigravity | ✅ Done | 0.2h |
| 5. Update automated tests, verify `npm test`, `npm run lint`, and `npm run build` | Antigravity | ✅ Done | 0.3h |

## Daily Log

### 2026-10-17
- Initialized Sprint 24: Implement Labor/Jasa Item Entry Toggle in Service Advisor RAB Calculator.
- Applied PostgreSQL migration `20261017010000_add_unit_notes_to_rab_items.sql` adding `unit` and `notes` to `public.rab_items`.
- Updated TypeScript interface `RabItemRecord` in `src/types/database.ts` with `unit?: string;`, `notes?: string | null;`, and `wbs_stage?: string;`.
- Upgraded `RabCalculator.tsx`:
  - Added modern toggle tabs switch: "Bahan Baku (Material)" (Default), "Jasa / Tukang (Labor)", and "Overhead".
  - Created dedicated Labor input form with required inputs: Nama Jasa, Tahapan WBS dropdown (WBS 1 to WBS 5), Estimasi Biaya Jasa / Upah (Rp), and optional Scope Pekerjaan textarea.
  - Automatically hidden material inventory dropdown and waste factor when in Labor mode.
  - Handled seamless Add and Edit workflows ("Tambah Jasa ke RAB" vs "Update Jasa ke RAB").
  - Mapped payload to `item_type = 'LABOR'`, `material_id = null`, `quantity = 1`, `unit = 'lot'`, and `wbs_category = stage`.
  - Added distinct visual badges: `[ MATERIAL ]` (cyan/blue) and `[ JASA / TUKANG ]` (orange/amber).
  - Added detailed per-WBS summary card breakdown (Material, Jasa, Total) in estimation footer.
- Updated component test suite `src/components/__tests__/RabCalculatorLabor.test.tsx` (6 tests).
- Verified empirical database integrity on PostgreSQL, verifying `item_type = 'LABOR'`, `material_id = null`, `unit_price = 500000`, `subtotal = 500000`, and `wbs_stage = 'WBS 2: Sasis/Rangka'`.
- Executed `npm test` (85/85 passing across 11 files), clean TypeScript compilation (`tsc -b`), zero linter errors (`npm run lint`), and successful production build (`npm run build`).

## Retrospective (2026-10-17)

### What Went Well
- Complete alignment between business objective and implementation: Service Advisors now have a clean, intuitive, and dedicated form for labor allocation per WBS without being forced through the inventory material autocomplete or multi-WBS allocation matrix.
- Clean database snapshot persistence with `item_type = 'LABOR'` and `material_id = null`, seamlessly integrating with `view_wbs_cost_variance` and eliminating false over-budget warnings in `/finance-reports`.
- Distinct visual badges (`[ MATERIAL ]` in cyan and `[ JASA / TUKANG ]` in amber) make the RAB calculation table readable at a glance.
- 100% test pass rate (85/85 tests passed) and 0 linter errors.

### What Could Improve
- Continue monitoring user feedback on default WBS labor presets (e.g. standard rate libraries) for recurring body repair tasks.

### Action Items
- [x] Archive Sprint 24 to `.gsd/sprints/sprint-24-implement-labor-jasa-item-entry-toggle-in-service-advisor-rab-calculator.md`.
- [x] Update `.gsd/STATE.md` with completed sprint status.
