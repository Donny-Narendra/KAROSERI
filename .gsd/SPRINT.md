# Sprint 81 — Allow Multi-Instance Package Selection in Change Orders with Strict Duplicate Prevention

> **Duration**: 2026-10-23 to 2026-10-24
> **Status**: In Progress

## Goal
Enable users to select and add the same finished goods product assembly package (BOM) multiple times to a Change Order without restriction from initial RAB locks, assigning a unique `package_instance_id` per application session, and enforcing strict UI double-submit guards (state locking + debounce) on both the modal apply button and final Change Order submission.

## Scope

### Included
- **Task 1: Unlocked Package Selection in Change Order Form**
  - Ensure product package dropdowns in `AmendmentManager.tsx` and `ChangeOrderPackageModal.tsx` remain 100% unlocked and selectable, regardless of whether a package is already allocated in the initial RAB or existing draft items.
- **Task 2: Unique Package Instance Identifier (`package_instance_id`)**
  - Update `packageExplosion.ts` (`ExplodedChangeOrderItem`) and `AmendmentManager.tsx` (`DraftItem`) to support `package_instance_id`.
  - In `ChangeOrderPackageModal.tsx`, generate `instanceId = crypto.randomUUID()` whenever a package is exploded and applied, assigning this unique `package_instance_id` to all component breakdown items of that session.
  - In `AmendmentManager.tsx`, persist `package_instance_id` on draft items and when submitting to backend, ensuring subsequent additions of the same package remain distinctly identifiable.
- **Task 3: Strict Double-Submit Prevention (UI Loading Guard & Debounce)**
  - In `ChangeOrderPackageModal.tsx`:
    - Implement `isApplying` guard state and debounce timeout.
    - Set apply button `disabled={isApplying || ...}` and display `Memproses...` when applying.
    - Prevent double-click execution from adding duplicate sets of items.
  - In `AmendmentManager.tsx`:
    - Add re-entrancy guard in `handleSubmitFinalChangeOrder` (`if (submitting) return;`).
    - Keep final submit button disabled with loading indicator (`submitting ? 'Menyimpan Change Order...' : 'Ajukan Change Order'`) until backend response completes.
- **Task 4: Database Migration & Service Layer Support**
  - Add PostgreSQL migration for `package_instance_id`, `package_source_id`, and `package_name` on `change_order_items`.
  - Update `spkService.ts` (`createChangeOrder`) with defensive column fallback (PostgreSQL 42703 error handling).
- **Task 5: Comprehensive Testing & Quality Verification**
  - Add unit and component test suites in `ChangeOrderPackageModal.test.tsx` and `AmendmentManager.test.tsx` testing:
    - Multiple selections of the same package with distinct `package_instance_id`.
    - Double-click prevention on "Terapkan Item ke Change Order" (ensuring only 1 set is added).
    - Double-submit prevention on "Ajukan Change Order".
    - Financial recalculation when the same package is added twice.
  - Pass full quality gate: Vitest test suite, Oxlint linter, TypeScript compiler (`tsc --noEmit`), and production build (`npm run build`).

### Explicitly Excluded
- Changing RAB Calculator's initial package locking behavior (RAB initial allocation remains locked to protect the baseline contract).
- Modifying warehouse requisition approval matrix beyond supporting new item columns.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Ensure package selection is fully enabled in `AmendmentManager.tsx` and `ChangeOrderPackageModal.tsx` | Antigravity | ⏳ In Progress | 0.5h |
| 2. Implement `package_instance_id` in `packageExplosion.ts`, `ChangeOrderPackageModal.tsx`, and `AmendmentManager.tsx` | Antigravity | ⬜ Todo | 0.5h |
| 3. Add double-submit UI guards & debounce on modal apply and form submit buttons | Antigravity | ⬜ Todo | 0.5h |
| 4. Add database migration & `spkService.ts` persistence with defensive fallback | Antigravity | ⬜ Todo | 0.5h |
| 5. Update automated tests and run full quality gates | Antigravity | ⬜ Todo | 0.5h |

## Daily Log

### 2026-10-23
- Archived Sprint 80 into `.gsd/sprints/sprint-80-add-source-package-granular-origin-column-to-rab-calculator-table.md`.
- Initialized Sprint 81.
- Analyzed `AmendmentManager.tsx`, `ChangeOrderPackageModal.tsx`, `packageExplosion.ts`, and `spkService.ts`.
- Verified baseline tests: 21 existing tests in `ChangeOrderPackageModal.test.tsx` and `AmendmentManager.test.tsx` passing.
