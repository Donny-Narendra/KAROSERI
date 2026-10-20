# Sprint 59 — Remove Waste Factor Completely from RAB Calculator and Data Layer

> **Duration**: 2026-10-20 to 2026-10-20
> **Status**: In Progress

## Goal
Eliminate the waste factor parameter completely from SPK creation, RAB calculations, assembly package/BOM allocation, and the database schema to simplify calculations to pure (Qty × Unit Price) and prevent PostgREST cache errors (PGRST204).

## Scope

### Included
- **UI & Formula Refactor (`RabCalculator.tsx`)**:
  - Remove table column header `<th className="px-3 py-3 text-right">Waste</th>` and corresponding `<td>` cell.
  - Simplify subtotal formula: `calculateItemTotal = (item) => Number(item.qty) * Number(item.unitPrice || 0)`.
  - Remove `wasteFactor` from local state (`newItem`, resets, handlers, tab switches) and remove hidden waste factor input.
  - Clean `waste_factor` out of database insertion payload (`itemsToInsert`).
- **Modal & Service Layer Alignment**:
  - Refactor `PackageAllocationModal.tsx` to remove `wasteFactor` property and mapping.
  - Refactor `packageService.ts` to remove `waste_factor` from `rabItemsToInsert` payload.
  - Clean up `rabExport.ts` to remove Waste column and waste multipliers from Excel and print quotation outputs.
  - Deprecate/clean `waste_factor` in SPK/RAB type definitions (`spk.ts` / `database.ts`).
- **Supabase Database Migration**:
  - Create `supabase/migrations/20261023020000_remove_waste_factor.sql` to make `waste_factor` and `waste_factor_percentage` nullable with default 0 in `rab_items` and reload PostgREST schema cache.
- **Testing & Quality Assurance**:
  - Update unit and integration tests across components and services (`RabCalculatorLabor.test.tsx`, `packageAssemblyImport.test.ts`, `rabLaborBudget.test.ts`, etc.).
  - Run full test suite, linter (`oxlint`), and TypeScript build.

### Explicitly Excluded
- Modifying inventory master `materials` table schema (physical warehouse tracking).
- Changing warehouse Goods Issue operational verification unless directly referencing rab_items waste_factor.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Refactor UI & Formula in `RabCalculator.tsx` | Antigravity | 🔄 In Progress | 0.4h |
| 2. Align Modal & Service Layer (`PackageAllocationModal.tsx`, `packageService.ts`, `rabExport.ts`, types) | Antigravity | ⬜ Todo | 0.4h |
| 3. Create Supabase Database Migration (`20261023020000_remove_waste_factor.sql`) | Antigravity | ⬜ Todo | 0.2h |
| 4. Update Tests and Validate with Vitest, Oxlint, and Build | Antigravity | ⬜ Todo | 0.3h |

## Daily Log

### 2026-10-20
- Initialized Sprint 59: Remove Waste Factor Completely from RAB Calculator and Data Layer.
- Began Task 1: Refactoring `RabCalculator.tsx`.

## Risks & Blockers

| Risk | Impact | Mitigation |
|------|--------|------------|
| Legacy records or existing tests expecting `wasteFactor` property | Low | Clean up tests and keep deprecated optional property in types if needed |

## Retrospective (end of sprint)

### What Went Well
- (To be filled at close)

### What Could Improve
- (To be filled at close)

### Action Items
- [ ] (To be filled at close)

---

*Last updated: 2026-10-20*
