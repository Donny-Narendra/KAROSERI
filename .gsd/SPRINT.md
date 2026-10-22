# Sprint 76 — Format Source Column with RAB or Change Order Prefix and Granular Fallback in Warehouse Tables

> **Duration**: 2026-10-22 to 2026-10-23
> **Status**: Completed

## Goal
Implement a refined source origin labeling format for the `SUMBER / PAKET` column in both "Pending Requisitions (Mandor)" and "Recent Material Issues" tables across `/warehouse` and `/service-advisor` dashboards. The label must explicitly prefix document origin ("RAB" or "Change Order"), specify package name when applicable (e.g., `RAB • Paket: SLEBOR BELAKANG` / `Change Order • Paket: SLEBOR BELAKANG`), and fall back to "Granular" for non-packaged/loose items (e.g., `RAB • Granular` / `Change Order • Granular`), with distinct color-coded badges while preserving ascending WBS stage sorting (WBS 1 -> WBS 2 -> WBS 3 -> WBS 4 -> WBS 5).

## Scope

### Included
- Refactor `src/utils/sourceOrigin.ts`:
  - Export interface `SourceOriginResult` (`origin: 'RAB' | 'Change Order'`, `typeLabel: string`, `fullLabel: string`, `badgeClass: string`).
  - Implement `resolveDetailedSource(item, req)`:
    - Distinguishes document origin between `'Change Order'` and `'RAB'` via `change_order_id`, `change_order_item_id`, `source_type === 'CHANGE_ORDER'`, `is_change_order`, etc.
    - Resolves package name from direct properties (`package_name`, `product_packages.name`, etc.) and note formats (`[Paket: ...]`).
    - Cleans duplicate `Paket:` prefixes to avoid repeated labels.
    - If package exists: returns `${origin} • Paket: ${cleanPackageName}` with theme badges (`bg-purple-950/70 text-purple-300 border border-purple-600/50` for Change Order, `bg-amber-950/70 text-amber-300 border border-amber-600/50` for RAB).
    - If package does NOT exist: returns `${origin} • Granular` with theme badges (`bg-indigo-950/70 text-indigo-300 border border-indigo-600/50` for Change Order, `bg-blue-950/70 text-blue-300 border border-blue-600/50` for RAB).
  - Update `resolveItemSource` and `extractIssueSource` to leverage `resolveDetailedSource` seamlessly.
- Update `RequisitionApproval.tsx`:
  - Render `resolveDetailedSource` output in the `SUMBER / PAKET` column with appropriate styling and tooltip.
  - Maintain ascending WBS sorting for tickets and requisition items.
- Update `RecentMaterialIssues.tsx`:
  - Render `resolveDetailedSource` output in the `SUMBER / PAKET` column with appropriate styling.
  - Ensure search query matches against `origin`, `typeLabel`, `fullLabel`, and package name.
  - Maintain ascending WBS sorting and secondary timestamp sorting.
- Update and add automated unit & integration tests:
  - `src/utils/__tests__/sourceOrigin.test.ts`
  - `src/components/__tests__/RequisitionApprovalWbsSort.test.tsx`
  - `src/components/__tests__/RecentMaterialIssues.test.tsx`
- Complete quality validation:
  - Unit tests (`npm test`)
  - Linter (`npx oxlint`)
  - Static type checking (`tsc --noEmit`)
  - Production build (`npm run build`)

### Explicitly Excluded
- Database schema changes (the optional schema migration is already prepared if needed).
- Altering Gate 2 budget validation thresholds or approval state machines.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Refactor `src/utils/sourceOrigin.ts` with `resolveDetailedSource` & update unit tests | Antigravity | ✅ Done | 0.5h |
| 2. Apply `resolveDetailedSource` in `RequisitionApproval.tsx` & verify ascending WBS sort | Antigravity | ✅ Done | 0.5h |
| 3. Apply `resolveDetailedSource` in `RecentMaterialIssues.tsx` & reactive search filter | Antigravity | ✅ Done | 0.5h |
| 4. Update and expand automated component tests | Antigravity | ✅ Done | 0.5h |
| 5. Run full quality gate (Vitest, Oxlint, TypeScript compiler, Production Build) | Antigravity | ✅ Done | 0.5h |

## Daily Log

### 2026-10-22
- Sprint 76 created.
- Archived Sprint 75 into `.gsd/sprints/sprint-75-add-source-origin-column-and-package-name-with-ascending-wbs-sorting-in-warehouse-requisitions-and-recent-issues.md`.
- Implemented `resolveDetailedSource` in `src/utils/sourceOrigin.ts`:
  - Formats document origin (`RAB` vs `Change Order`).
  - Resolves package names from direct attributes and note tags (`[Paket: ...]`), cleaning duplicate `Paket:` prefixes.
  - Generates `${origin} • Paket: ${cleanName}` with amber (RAB) or purple (Change Order) theme classes.
  - Falls back to `${origin} • Granular` with blue (RAB) or indigo (Change Order) theme classes.
  - Updated `resolveItemSource` and `extractIssueSource` for backward and forward compatibility.
- Updated `src/components/RequisitionApproval.tsx`:
  - Uses `resolveDetailedSource` in the `SUMBER / PAKET` column.
  - Verified ascending WBS sorting is preserved at both ticket and item levels.
  - Cleaned up unused imports.
- Updated `src/components/RecentMaterialIssues.tsx`:
  - Uses `resolveDetailedSource` in the `SUMBER / PAKET` column (column index 2).
  - Search query filters across `fullLabel`, `origin`, `typeLabel`, and package name.
  - Preserves ascending WBS sorting and secondary timestamp sorting.
  - Cleaned up unused imports.
- Unit and Component Tests:
  - `src/utils/__tests__/sourceOrigin.test.ts`: 19 tests passing.
  - `src/components/__tests__/RequisitionApprovalWbsSort.test.tsx`: 4 tests passing.
  - `src/components/__tests__/RecentMaterialIssues.test.tsx`: 13 tests passing.
- Quality Gate:
  - Vitest: 58 test files passed, 389 tests passed (0 failures).
  - Oxlint: 0 warnings, 0 errors across 199 files.
  - TypeScript: `tsc --noEmit` and `tsc -b` completed with 0 errors.
  - Production build: `npm run build` generated cleanly in 501ms.
