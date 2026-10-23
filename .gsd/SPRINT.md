# Sprint 78 — Fix Package Selection State and Implement Per-Component WBS Allocation Matrix in Change Order Modal

> **Duration**: 2026-10-23 to 2026-10-24
> **Status**: Completed

## Goal
Fix package selection dropdown state synchronization and implement per-component WBS 1 to 5 allocation matrix in the Change Order package modal (`ChangeOrderPackageModal.tsx`), matching the RAB Calculator modal UX:
1. **Package Dropdown Binding**: When a user selects a package from "Pilih Paket Barang Jadi (Assembly List)" in `AmendmentManager.tsx`, the modal dialog opens with that specific package selected (not defaulting to the first item).
2. **Per-Component WBS Allocation Matrix**: Replace the binary WBS toggle buttons (`Single WBS Target` / `Multi-WBS`) with a per-component interactive allocation table:
   - Columns: `KOMPONEN` (Name & Badge MATERIAL/LABOR), `TOTAL KUOTA` (Base Qty × Package Qty), `WBS 1`, `WBS 2`, `WBS 3`, `WBS 4`, `WBS 5`, and `SISA` (Color-coded remainder badge).
   - Pre-populate inputs with `default_wbs_allocation` template recipe when available.
   - On "Terapkan Item ke Change Order", explode components across allocated WBS stages into itemized Change Order draft rows.

## Scope

### Included
- `src/components/AmendmentManager.tsx`:
  - Bind `onChange` on package dropdown to pass selected package ID to modal state.
  - Sync selected package ID when modal opens from dropdown vs button.
- `src/components/ChangeOrderPackageModal.tsx`:
  - Accept initial `selectedPackageId` and `initialPackageId` prop and bind modal package dropdown.
  - Remove binary Single/Multi WBS distribution toggle buttons.
  - Add per-component WBS allocation matrix state: `Record<string, { wbs1: string, wbs2: string, wbs3: string, wbs4: string, wbs5: string }>`.
  - Load `default_wbs_allocation` from package item recipe into allocation state.
  - Provide table UI with interactive inputs for WBS 1-5, total quota calculation, and dynamic remainder status badge (`PASSED`, `Sisa`, `Over`).
  - Update `handleApply` to explode components with allocated qty > 0 into Change Order item objects.
- `src/utils/packageExplosion.ts`:
  - Export `WBS_COLUMNS`, `WbsKey`, and `explodePackageWithAllocations` utility function.
- Unit and Component tests:
  - Add tests for package selection binding and modal opening in `ChangeOrderPackageModal.test.tsx` and `AmendmentManager.test.tsx`.
  - Add tests for per-component WBS allocation matrix, calculations, and explosion into draft items.
- Full verification: Vitest test suites (58 suites, 399 tests pass), Oxlint linter (0 errors, 0 warnings), TypeScript compiler (`tsc --noEmit`), production build (`npm run build`).

### Explicitly Excluded
- Database schema migrations (existing schemas and tables are fully compatible).
- Changes to approval flows or cashiers.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Fix package dropdown selection state and props passing in `AmendmentManager.tsx` | Antigravity | ✅ Completed | 0.5h |
| 2. Implement per-component WBS allocation matrix in `ChangeOrderPackageModal.tsx` | Antigravity | ✅ Completed | 1.5h |
| 3. Implement item explosion logic on "Terapkan Item ke Change Order" | Antigravity | ✅ Completed | 0.5h |
| 4. Update and expand tests in `AmendmentManager.test.tsx` and `ChangeOrderPackageModal.test.tsx` | Antigravity | ✅ Completed | 1.0h |
| 5. Run full quality gate (Vitest, Oxlint, TypeScript compiler, Production Build) | Antigravity | ✅ Completed | 0.5h |

## Daily Log

### 2026-10-23
- Sprint 78 initialized.
- Fixed package dropdown state synchronization in `AmendmentManager.tsx`:
  - Added `selectedPackageId` state.
  - Bound dropdown `onChange` to `handleOpenPackageModal(val)`.
  - Passed `selectedPackageId` and `onPackageChange` to `ChangeOrderPackageModal`.
- Refactored `ChangeOrderPackageModal.tsx`:
  - Replaced binary `Single WBS Target` / `Multi-WBS` toggle buttons with per-component WBS 1 to 5 interactive matrix table.
  - Bound modal's `<select>` to `selectedPackageId`.
  - Supported `default_wbs_allocation` recipe auto-population and multiplier scaling.
  - Implemented dynamic remainder badges: `PASSED` (green), `Sisa: X` (amber), `Over: X` (red).
  - Implemented live financial summary and item explosion on "Terapkan Item ke Change Order".
- Added `explodePackageWithAllocations`, `WBS_COLUMNS`, and `WbsKey` to `packageExplosion.ts`.
- Updated unit test suites in `ChangeOrderPackageModal.test.tsx` (10 tests passing) and `AmendmentManager.test.tsx` (8 tests passing).
- Passed full verification gate:
  - Automated tests: 58 test suites, 399 tests passing (100% green).
  - Linter: `oxlint` 0 warnings, 0 errors across 199 files.
  - TypeScript compiler: `tsc --noEmit` clean.
  - Production build: `npm run build` succeeds in 430ms.
