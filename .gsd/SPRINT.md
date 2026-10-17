# Sprint 24 — Implement Labor/Jasa Item Entry Toggle in Service Advisor RAB Calculator

> **Duration**: 2026-10-17 to 2026-10-17
> **Status**: In Progress

## Goal
Add an intuitive Labor/Jasa item entry toggle in `RabCalculator.tsx` with dedicated fields (Name, WBS Stage 1-5 dropdown, Estimated Cost, Scope/Notes) so Service Advisors can budget labor costs per WBS stage directly without material dependencies or complex allocation matrices.

## Scope

### Included
- **Schema & Type Alignment**:
  - Add optional `unit` and `notes` to `public.rab_items` and update TypeScript interface `RabItemRecord` in `src/types/database.ts`.
- **Toggle Mode Input Item (`RabCalculator.tsx`)**:
  - Provide clear toggle switch above item form:
    - "Bahan Baku (Material)" (Default)
    - "Jasa / Tukang (Labor)"
    - "Overhead" (retained for workshop bay overheads)
- **Dedicated Form for Jasa / Tukang**:
  - Nama Jasa / Pekerjaan Tukang (`text` input, required)
  - Tahapan WBS (`select` dropdown: WBS 1: Pembongkaran, WBS 2: Sasis/Rangka, WBS 3: Dinding/Fabrikasi, WBS 4: Pengecatan, WBS 5: Kelistrikan/Hidrolik)
  - Estimasi Biaya Jasa / Upah (Rp) (`number` input, required)
  - Catatan / Scope Pekerjaan (`textarea` optional)
  - Submit button: "Tambah Jasa ke RAB"
- **Payload & Database Persistence**:
  - `item_type = 'LABOR'`, `material_id = null`, `quantity = 1`, `unit = 'lot'`, `unit_price = cost`, `wbs_category = stage`, `notes = notes`.
  - Mutate state and persist to Supabase `rab_items` and `rab_estimations`.
- **Estimation Table & Summary**:
  - Badges: `[ MATERIAL ]` (cyan/blue) and `[ JASA / TUKANG ]` (orange/amber).
  - Hide inventory stock / waste factor on labor items.
  - Ensure labor total accumulates in Grand Total and Pagu Jasa.
- **Verification & Testing**:
  - Component tests in `src/components/__tests__/RabCalculatorLabor.test.tsx`.
  - Validate with `npm test`, `npm run lint`, and `npm run build`.

### Explicitly Excluded
- Modifying SPK billing or handover lock triggers.
- Modifying Mandor QC inspection workflows.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Align schema & types (`unit`, `notes` in `rab_items` & `database.ts`) | Antigravity | ⬜ Todo | 0.2h |
| 2. Implement toggle switch & dedicated Labor form in `RabCalculator.tsx` | Antigravity | ⬜ Todo | 0.5h |
| 3. Connect labor payload submission & editing to state & Supabase upsert | Antigravity | ⬜ Todo | 0.3h |
| 4. Update estimation table badges (`[ MATERIAL ]`, `[ JASA / TUKANG ]`) & WBS cost summary | Antigravity | ⬜ Todo | 0.2h |
| 5. Update automated tests, verify `npm test`, `npm run lint`, and `npm run build` | Antigravity | ⬜ Todo | 0.3h |

## Daily Log

### 2026-10-17
- Initialized Sprint 24: Implement Labor/Jasa Item Entry Toggle in Service Advisor RAB Calculator.
