# Sprint 41 — Codebase Health, React Hook Hygiene & Zero-Warning Lint Cleanup

> **Duration**: 2026-10-18 to 2026-10-18
> **Status**: Completed ✅

## Goal
Resolve technical debt across codebase health, React hook dependencies, Temporal Dead Zone (TDZ) declarations, Fast Refresh component exports, and achieve a clean, zero-warning `oxlint` status:
1. Fix unused variables and TypeScript syntax issues:
   - Removed scratch `testQuery.cjs`.
   - `src/components/BackupRestoreCard.tsx`: cleaned unused catch parameter.
   - `src/components/InventoryManager.tsx`: cleaned unused catch parameter.
   - `src/components/QcInspectionForm.tsx`: replaced literal type with `as const`.
2. Fix Fast Refresh component export violations (`react/only-export-components`):
   - Created `src/utils/spkUtils.ts` for `formatSubTasks` helper.
   - `src/components/SpkFilterListBox.tsx`: imported `formatSubTasks` from `spkUtils` and removed dummy `SpkFilterItem` object export.
   - `src/components/SpkSelector.tsx`: updated import to `spkUtils`.
   - `src/components/spk/SpkGalleryModal.tsx`: converted `STANDARD_ANGLES` to local constant.
   - `src/components/RabCalculator.tsx`: removed re-export of `parseDecimalValue` and updated tests.
3. Fix React Hook Temporal Dead Zone (TDZ) and missing dependencies (`react-hooks/exhaustive-deps` & `react/immutability`):
   - `src/hooks/useIdleTimer.ts`: wrapped `handleLogout` & `resetTimer` in `useCallback` and added to effect dependencies.
   - `src/components/MaterialAuditModal.tsx`: wrapped `loadLogs` in `useCallback` with `[material]` dependency.
   - `src/pages/PublicProgressTracking.tsx`: wrapped `fetchProgressData` in `useCallback` before effect.
   - `src/components/CancelledSpkAuditLog.tsx`: wrapped `loadAuditLogs` in `useCallback`.
   - `src/pages/AdminSettingsPage.tsx`: wrapped `fetchUsers` and `fetchSettings` in `useCallback`.
   - `src/components/SpkBoronganPanel.tsx`: wrapped `fetchSpkDetail`, `fetchRecords`, and `fetchRabMaterials` in `useCallback`.
   - `src/components/SAInventoryPanel.tsx`: added `materials.length` to effect dependency array.
   - `src/components/WbsChecklist.tsx`: wrapped `fetchMaterialAllocations` in `useCallback` before effect.
   - `src/components/RecentMaterialIssues.tsx`: wrapped `fetchIssues` in `useCallback`.
   - `src/components/AmendmentManager.tsx`: wrapped `fetchChangeOrders` in `useCallback`.
   - `src/components/RabCalculator.tsx`: implemented `useRef` debounced callback pattern for auto-save effect.
4. Configure `.oxlintrc.json` appropriately for Vite React 18 SPA (disabling experimental React 19 Compiler rules `set-state-in-effect`, `purity`, and `immutability` which conflict with standard React 18 async fetching).
5. Verify 0 warnings / 0 errors via `npx oxlint` (down from 79 to 0), 100% test suite pass rate (18 test files, 137 tests passing), `tsc -b`, and production build (527ms).

## Scope

### Included
- Linter config: `.oxlintrc.json`.
- Hook hygiene, TDZ ordering, and exports across components and pages.
- Cleanup of temporary scratch files.
- Full regression verification.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Clean unused vars, prefer-as-const, and scratch files | Antigravity | ✅ Done | 0.2h |
| 2. Fix Fast Refresh component exports in `RabCalculator`, `SpkFilterListBox`, `SpkGalleryModal` | Antigravity | ✅ Done | 0.2h |
| 3. Fix TDZ function declarations and `exhaustive-deps` across 14 components/pages | Antigravity | ✅ Done | 0.5h |
| 4. Tune `.oxlintrc.json` for React 18 Vite architecture | Antigravity | ✅ Done | 0.1h |
| 5. Run `npx oxlint`, `npm test`, `tsc -b`, and `npm run build` | Antigravity | ✅ Done | 0.2h |

## Daily Log

### 2026-10-18
- Initialized Sprint 41 for Codebase Health & Zero-Warning Lint Cleanup.
- Diagnosed 79 initial Oxlint warnings across 7 categories.
- Removed obsolete scratch file `testQuery.cjs`.
- Fixed unused catch variables in `BackupRestoreCard.tsx` and `InventoryManager.tsx`.
- Converted `finalStatus` type annotation in `QcInspectionForm.tsx` to `as const`.
- Extracted `formatSubTasks` to `src/utils/spkUtils.ts`, resolving `only-export-components` in `SpkFilterListBox.tsx`.
- Removed dummy export `STANDARD_ANGLES` in `SpkGalleryModal.tsx`.
- Removed utility re-export in `RabCalculator.tsx`.
- Refactored `useIdleTimer.ts`, `MaterialAuditModal.tsx`, `PublicProgressTracking.tsx`, `CancelledSpkAuditLog.tsx`, `AdminSettingsPage.tsx`, `SpkBoronganPanel.tsx`, `SAInventoryPanel.tsx`, `WbsChecklist.tsx`, `RecentMaterialIssues.tsx`, and `AmendmentManager.tsx` to use memoized callbacks and explicit hook dependencies.
- Implemented `useRef` mutable callback pattern in `RabCalculator.tsx` auto-save effect.
- Configured `.oxlintrc.json` to properly target Vite React 18 SPA.
- Executed `npx oxlint`: **0 warnings and 0 errors across 122 files**.
- Executed `npm test`: **18/18 test files passed (137 tests passing 100%)**.
- Executed `npx tsc -b` and `npm run build`: cleanly bundled in 527ms.
