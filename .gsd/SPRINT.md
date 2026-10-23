# Sprint 81 — Allow Multi-Instance Package Selection in Change Orders with Strict Duplicate Prevention

> **Duration**: 2026-10-23 to 2026-10-23
> **Status**: Completed

## Goal
Enable users to select and add the same finished goods product assembly package (BOM) multiple times to a Change Order without restriction from initial RAB locks, assigning a unique `package_instance_id` per application session, and enforcing strict UI double-submit guards (state locking + debounce) on both the modal apply button and final Change Order submission.

## Scope

### Included
- **Task 1: Unlocked Package Selection in Change Order Form**
  - Verified product package dropdowns in `AmendmentManager.tsx` and `ChangeOrderPackageModal.tsx` remain 100% unlocked and selectable, regardless of whether a package is already allocated in the initial RAB or existing draft items.
- **Task 2: Unique Package Instance Identifier (`package_instance_id`)**
  - Updated `packageExplosion.ts` (`ExplodedChangeOrderItem`) and `AmendmentManager.tsx` (`DraftItem`) to support `package_instance_id`.
  - In `ChangeOrderPackageModal.tsx`, generated `instanceId = generateUUID()` whenever a package is exploded and applied, assigning this unique `package_instance_id` to all component breakdown items of that session.
  - In `AmendmentManager.tsx`, persisted `package_instance_id` on draft items and when submitting to backend, ensuring subsequent additions of the same package remain distinctly identifiable.
- **Task 3: Strict Double-Submit Prevention (UI Loading Guard & Debounce)**
  - In `ChangeOrderPackageModal.tsx`:
    - Implemented `isApplying` guard state and 500ms debounce timeout.
    - Set apply button `disabled={isApplying || ...}` and display `Memproses...` when applying.
    - Prevented double-click execution from adding duplicate sets of items.
  - In `AmendmentManager.tsx`:
    - Added re-entrancy guard in `handleSubmitFinalChangeOrder` (`if (submitting) return;`).
    - Kept final submit button disabled with loading indicator (`submitting ? 'Menyimpan Change Order...' : 'Ajukan Change Order'`) until backend response completes.
- **Task 4: Database Migration & Service Layer Support**
  - Added PostgreSQL migration `20261023040000_add_package_instance_to_change_order_items.sql` for `package_instance_id`, `package_source_id`, and `package_name` on `change_order_items` with indexes.
  - Updated `spkService.ts` (`createChangeOrder`) with defensive column fallback (PostgreSQL 42703 error handling).
- **Task 5: Comprehensive Testing & Quality Verification**
  - Added unit and component test suites in `ChangeOrderPackageModal.test.tsx` and `AmendmentManager.test.tsx` testing:
    - Multiple selections of the same package with distinct `package_instance_id`.
    - Double-click prevention on "Terapkan Item ke Change Order" (ensuring only 1 set is added).
    - Double-submit prevention on "Ajukan Change Order".
    - Financial recalculation when the same package is added twice.
  - Passed full quality gate: Vitest test suite (60 suites, 420 tests passing), Oxlint linter (0 errors, 0 warnings), TypeScript compiler (`tsc -b`), and production build (`npm run build`).

### Explicitly Excluded
- Changing RAB Calculator's initial package locking behavior (RAB initial allocation remains locked to protect the baseline contract).
- Modifying warehouse requisition approval matrix beyond supporting new item columns.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Ensure package selection is fully enabled in `AmendmentManager.tsx` and `ChangeOrderPackageModal.tsx` | Antigravity | ✅ Completed | 0.5h |
| 2. Implement `package_instance_id` in `packageExplosion.ts`, `ChangeOrderPackageModal.tsx`, and `AmendmentManager.tsx` | Antigravity | ✅ Completed | 0.5h |
| 3. Add double-submit UI guards & debounce on modal apply and form submit buttons | Antigravity | ✅ Completed | 0.5h |
| 4. Add database migration & `spkService.ts` persistence with defensive fallback | Antigravity | ✅ Completed | 0.5h |
| 5. Update automated tests and run full quality gates | Antigravity | ✅ Completed | 0.5h |

## Daily Log

### 2026-10-23
- Archived Sprint 80 into `.gsd/sprints/sprint-80-add-source-package-granular-origin-column-to-rab-calculator-table.md`.
- Initialized Sprint 81.
- Analyzed `AmendmentManager.tsx`, `ChangeOrderPackageModal.tsx`, `packageExplosion.ts`, and `spkService.ts`.
- Implemented Task 1:
  - Verified dropdown options in `AmendmentManager.tsx` and `ChangeOrderPackageModal.tsx` remain unlocked.
  - Added automated test in `ChangeOrderPackageModal.test.tsx` verifying all package options are enabled.
- Implemented Task 2:
  - Added `package_instance_id` to `ExplodedChangeOrderItem` in `packageExplosion.ts` and `DraftItem` in `AmendmentManager.tsx`.
  - Added `generateUUID` helper in `packageExplosion.ts`.
  - Updated `explodePackageWithAllocations` and `explodePackageToDraftItems` to assign `instanceId` and distinct item IDs.
  - Updated `ChangeOrderPackageModal.tsx` to generate session-level `instanceId` on `handleApply`.
- Implemented Task 3:
  - Added `isApplying` state, disabled button state, `Memproses...` label, and 500ms debounce guard in `ChangeOrderPackageModal.tsx`.
  - Added `if (submitting) return;` guard in `handleSubmitFinalChangeOrder` and `Menyimpan Change Order...` button state in `AmendmentManager.tsx`.
- Implemented Task 4:
  - Created migration `20261023040000_add_package_instance_to_change_order_items.sql`.
  - Updated `ChangeOrderItemRecord` in `src/types/database.ts`.
  - Updated `createChangeOrder` in `spkService.ts` with `package_source_id`, `package_instance_id`, `package_name` and defensive 42703 retry fallback.
- Implemented Task 5:
  - Added test cases in `ChangeOrderPackageModal.test.tsx`:
    - `assigns unique package_instance_id and generates distinct item IDs on apply`
    - `enforces double-click guard and disables button showing "Memproses..." while applying`
    - `ensures all product packages in dropdown remain enabled and selectable`
  - Added test cases in `AmendmentManager.test.tsx`:
    - `allows adding the same product package multiple times with separate instance IDs and doubled totals`
    - `prevents multiple final Change Order submissions on rapid clicks`
  - All 26 modal and manager tests passed.
  - Full Vitest suite: 60 suites, 420 tests passing (100% green).
  - Oxlint: 0 warnings, 0 errors.
  - TypeScript: `tsc -b` clean.
  - Production build: `npm run build` completed in 417ms.
