# Sprint 20 — Eliminate `any` Type Casts and Enforce Strict TypeScript Data Contracts (Priority 5)

> **Duration**: 2026-10-17 to 2026-10-17
> **Status**: Completed ✅

## Goal
Eliminate untyped `any` casts and parameters across critical calculation and export modules (`KasirDashboard.tsx`, `RabCalculator.tsx`, and `rabExport.ts`), replacing them with explicit TypeScript interfaces for Supabase query joins, SPK metadata, and calculation summaries.

## Scope

### Included
- **Module 1: `src/utils/rabExport.ts`**:
  - Define interfaces `RabExportSpkDetails`, `RabExportItem`, `RabExportTotals`.
  - Replace `(spkDetails: any, rabItems: any[], totals: any)` in `exportRabToExcel` and `printRabQuotation` with strict types.
  - Type `wsData: (string | number)[][]` ensuring type-safe SheetJS array construction.
- **Module 2: `src/components/RabCalculator.tsx`**:
  - Add `RabSpkDetails` and `DbRabItemRecord` interfaces.
  - Replace `useState<any>(null)` with `useState<RabSpkDetails | null>(null)`.
  - Type `dbItem: DbRabItemRecord` with safe null/undefined handling.
  - Eliminate `(payload as any).materialId` by adding `materialId?: string` to `RabItemPayload` in `PackageAllocationModal.tsx`.
- **Module 3: `src/pages/KasirDashboard.tsx`**:
  - Define query response join types `KasirRabEstimationSummary`, `KasirRabItemSummary`, and `KasirSpkJoinRow`.
  - Type `fetchedEstimations` and `fetchedItems`.
  - Eliminate `d: any`, `curr: any`, `i: any`, `a: any`, and `item: any`.
  - Remove unnecessary `as any` casts on `qcStatus` and `paymentStatus`.
  - Safely type `catch (err: unknown)` blocks.
- **Verification & Documentation**:
  - Run `npm test` (60 Vitest tests passing across 7 suites).
  - Run `npm run lint` (0 errors across 106 files).
  - Run `npm run build` (`tsc -b && vite build` clean).
  - Update `.gsd/ARCHITECTURE.md` resolving "Explicit `any` Type Casts" technical debt.

### Explicitly Excluded
- Changing runtime business logic or component behavior.
- Altering HTML standard attributes (e.g. `step="any"` on input elements).

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Refactor `src/utils/rabExport.ts` with strict TypeScript contracts | Antigravity | ✅ Done | 0.2h |
| 2. Refactor `src/components/RabCalculator.tsx` to eliminate `any` | Antigravity | ✅ Done | 0.3h |
| 3. Refactor `src/pages/KasirDashboard.tsx` join query and mapping types | Antigravity | ✅ Done | 0.4h |
| 4. Validate full test suite, linting, and production build | Antigravity | ✅ Done | 0.2h |
| 5. Update ARCHITECTURE.md, STATE.md, and SPRINT.md | Antigravity | ✅ Done | 0.1h |

## Daily Log

### 2026-10-17
- Initialized Sprint 20 to eliminate `any` type casts across `KasirDashboard.tsx`, `RabCalculator.tsx`, and `rabExport.ts`.
- Refactored `src/utils/rabExport.ts`: defined `RabExportSpkDetails`, `RabExportItem`, `RabExportTotals`, and typed `exportRabToExcel`, `printRabQuotation`, and `wsData`.
- Refactored `src/components/PackageAllocationModal.tsx`: added `materialId?: string` to `RabItemPayload`.
- Refactored `src/components/RabCalculator.tsx`: added `RabSpkDetails`, `DbRabItemRecord`, typed `spkDetails` state and `itemsData` map, typed catch block, and eliminated `(payload as any)`.
- Refactored `src/pages/KasirDashboard.tsx`: added `KasirRabEstimationSummary`, `KasirRabItemSummary`, `KasirSpkJoinRow`, strictly typed join query mappings, removed `as any` from `qcStatus` and `paymentStatus`, typed invoice and amendment reducers.
- Validated: `npx tsc -b` (0 errors), `npm run lint` (0 errors), `npm test` (60/60 tests passing), `npm run build` (success).
- Updated `.gsd/ARCHITECTURE.md` resolving technical debt item.
