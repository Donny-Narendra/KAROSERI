# Sprint 77 — Refactor Change Order Form Layout to Match RAB Calculator Two-Column UI

> **Duration**: 2026-10-23 to 2026-10-24
> **Status**: Completed

## Goal
Refactor the Change Order creation form layout in `src/components/AmendmentManager.tsx` from row-based stacked cards into a unified 2-column Split Panel Grid matching the exact design and UX pattern of the RAB Calculator (`RabCalculator.tsx`):
- Header: Keep `DESKRIPSI & JUSTIFIKASI PERUBAHAN PEKERJAAN *` at the top of the form.
- Left Column (Input Builder): Assembly Package selection dropdown with modal trigger, Category switch toggles (`Bahan Baku (Material)`, `Jasa / Tukang (Labor)`, `Overhead (FOH)`), search/autocomplete inputs (Material master search, Labor with auto-suggest and custom name fallback, Overhead preset/custom input), Qty with decimal precision and auto-select on focus, Unit price & Cost price (HPP), interactive WBS 1 to 5 Allocation Grid with auto-validation status badge, and "+ Tambah ke Change Order" submit button.
- Right Column (Live Item Review & Financial Summary): Live itemized table (`DESCRIPTION`, `TYPE` badge, `WBS`, `QTY`, `HARGA SATUAN`, `HARGA MODAL (HPP)`, `SUBTOTAL`, `AKSI` edit/delete), category budget cards (`PAGU MATERIAL`, `PAGU JASA (LABOR)`, `OVERHEAD`), WBS stage summary cards (WBS 1 to WBS 5), comprehensive financial totals (`TOTAL ESTIMATED COST (HPP MODAL CO)`, `TOTAL HARGA JUAL (QUOTATION CO)`, `MARGIN (PROFIT CO)`), and final action buttons (`Batal`, `Ajukan Change Order`).

## Scope

### Included
- Refactor `src/components/AmendmentManager.tsx`:
  - Retain description and justification textarea at the top.
  - Implement two-column responsive split grid: `grid grid-cols-1 lg:grid-cols-3 gap-8`.
  - Left panel (`lg:col-span-1`):
    - Assembly List package selector dropdown + "+ Paket Barang Jadi" modal trigger.
    - Category toggle buttons: `Bahan Baku (Material)` vs `Jasa / Tukang (Labor)` vs `Overhead (FOH)`.
    - Dedicated input forms for Material, Labor, and Overhead with auto-select on focus and decimal support.
    - Interactive WBS Allocation Matrix (Total Qty, WBS 1 to WBS 5, Status badge with Sesuai/Sisa/Lebih).
    - Local item addition/update logic that splits allocated quantities across WBS stages into draft items.
  - Right panel (`lg:col-span-2`):
    - Live review table with columns: `Description`, `Type`, `WBS`, `Qty`, `Harga Satuan`, `Harga Modal (HPP)`, `Subtotal`, `Aksi / Status` (Edit & Delete).
    - Category budget cards: `PAGU MATERIAL`, `PAGU JASA (LABOR)`, `OVERHEAD`.
    - WBS stage cost summary matrix (WBS 1 to WBS 5 with material, labor, overhead breakdowns).
    - Real-time financial summary: `TOTAL ESTIMATED COST (HPP MODAL CO)`, `TOTAL HARGA JUAL (QUOTATION CO)`, `MARGIN (PROFIT CO)`.
    - Final submission buttons: `Batal` and `Ajukan Change Order`.
- Update and add comprehensive unit/component tests in `src/components/__tests__/AmendmentManager.test.tsx`:
  - Test two-column layout rendering.
  - Test WBS allocation grid behavior (validation, remainder badge).
  - Test adding material with multi-WBS allocation splitting into right-hand table.
  - Test category budget and WBS stage summaries.
  - Verify existing tests continue passing.
- Quality validation: Vitest tests, Oxlint linter, TypeScript compiler (`tsc --noEmit`), and production build (`npm run build`).

### Explicitly Excluded
- Database schema changes (backend table structures and migrations remain unchanged).
- Modifying cashiers or warehouse approval workflows outside the Change Order creation form.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Design & refactor `AmendmentManager.tsx` form state to support builder input & WBS allocation matrix | Antigravity | ✅ Completed | 1.0h |
| 2. Implement Left Column builder component (Assembly list dropdown, Category toggle, Autocomplete, Dual pricing, WBS Matrix) | Antigravity | ✅ Completed | 1.5h |
| 3. Implement Right Column review table & financial summary (Item table, Category pagu, WBS stage cards, Margins, Final submit) | Antigravity | ✅ Completed | 1.0h |
| 4. Update and expand automated component tests in `AmendmentManager.test.tsx` | Antigravity | ✅ Completed | 1.0h |
| 5. Run full quality gate (Vitest, Oxlint, TypeScript compiler, Production Build) and verify UI | Antigravity | ✅ Completed | 0.5h |

## Daily Log

### 2026-10-23
- Sprint 77 initialized.
- Archived Sprint 76 into `.gsd/sprints/sprint-76-format-source-column-with-rab-or-change-order-prefix-and-granular-fallback-in-warehouse-tables.md`.
- Analyzed `RabCalculator.tsx` and `AmendmentManager.tsx` UI architectures and state models.
- Refactored `AmendmentManager.tsx` to 2-column split layout (`grid grid-cols-1 lg:grid-cols-3 gap-8`):
  - Left Panel: Assembly list selector dropdown + modal trigger, category switch toggles (Material, Labor, Overhead), autocomplete search inputs, dual pricing (HPP vs Jual), and interactive WBS allocation grid (Total Qty, WBS 1 to 5, status badge) with local submission button.
  - Right Panel: Live review table with edit/delete actions, category pagu cards, WBS stage summary cards, comprehensive financial totals (HPP, Jual, Margins), and final actions (Batal & Ajukan CO).
- Added `data-testid` support to `MaterialAutocomplete.tsx`.
- Updated test suite in `AmendmentManager.test.tsx` with all 7 test cases passing.
- Passed full quality gate: 58 test suites (396 tests) pass, `oxlint` 0 warnings/0 errors on 199 files, `tsc --noEmit` clean, and `npm run build` succeeds in 446ms.
