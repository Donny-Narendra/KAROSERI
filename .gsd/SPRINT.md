# Sprint 33 — Filter SPK Borongan RAB Reference to Exclusively Show LABOR Items

> **Duration**: 2026-10-17 to 2026-10-17
> **Status**: In Progress 🟡

## Goal
Filter the RAB reference panel ("Panduan Pagu Jasa / Pekerjaan (RAB)") in the Mandor SPK Borongan modal (`SpkBoronganPanel.tsx`) to strictly and exclusively display items where `item_type = 'LABOR'`, preventing physical materials and overhead entries from appearing in the borongan assignment reference list, while updating header terminology and ensuring accurate count badges and auto-fill transfer actions (`<<`).

## Scope

### Included
- **Supabase Query & Client Filter in `SpkBoronganPanel.tsx`**:
  - Add `.eq('item_type', 'LABOR')` to Supabase `rab_items` query.
  - Select `item_type` and `unit` from `rab_items` alongside existing fields.
  - Add strict `item.item_type === 'LABOR'` checks in client-side WBS filtering and available materials filter.
- **Header Label & Terminology Refinement**:
  - Update header title from "Panduan Material (RAB)" to "Panduan Pagu Jasa / Pekerjaan (RAB)" with badge `[ Khusus Jasa / Borongan ]`.
  - Update helper guidance text, search input placeholder, column headers, and empty state messaging to clearly indicate labor/jasa borongan items.
- **Copy / Assignment Button Verification (`<<`)**:
  - Verify clicking `<<` auto-populates "Tugas / Uraian Pekerjaan" and "Nilai Kontrak Borongan (Rp)" from labor name and allocated subtotal.
  - Verify badge counter reflects strictly available LABOR items.
- **Unit Testing & Empirical Verification**:
  - Create dedicated unit tests in `src/components/__tests__/SpkBoronganPanel.test.tsx` testing LABOR filtering, exclusion of MATERIAL and OVERHEAD, available counter, and `<<` copy interaction.
  - Run full test suite (`npm test`), linter (`npx oxlint`), and production build (`npm run build`).

### Explicitly Excluded
- Database schema or migration modifications.
- Modifications to warehouse MaterialRequisitionForm flow.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Update Supabase query and client-side filter in `SpkBoronganPanel.tsx` to require `item_type === 'LABOR'` | Antigravity | ⬜ Todo | 0.2h |
| 2. Refine header label, badge, helper text, and column headers in `SpkBoronganPanel.tsx` | Antigravity | ⬜ Todo | 0.2h |
| 3. Create comprehensive unit tests in `src/components/__tests__/SpkBoronganPanel.test.tsx` | Antigravity | ⬜ Todo | 0.3h |
| 4. Validation (Vitest, Oxlint, Vite build) | Antigravity | ⬜ Todo | 0.2h |

## Daily Log

### 2026-10-17
- Initialized Sprint 33: Filter SPK Borongan RAB Reference to Exclusively Show LABOR Items.
- Archived Sprint 32 to `.gsd/sprints/sprint-32-fix-decimal-allocation-sum-and-status-calculation-for-overhead-in-rab-calculator.md`.
