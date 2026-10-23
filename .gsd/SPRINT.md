# Sprint 83 — Add Source Origin Column to Change Order Snapshot Table in Service Advisor

> **Duration**: 2026-10-24 to 2026-10-24
> **Status**: In Progress

## Goal
Add a new "SUMBER / PAKET" column to the Change Order Snapshot Table (`RINCIAN ITEM SNAPSHOT (POINT-IN-TIME)`) in Service Advisor accordion cards, rendering badges for assembly package origin (`📦 Paket: [Nama Paket]`) and granular entries (`📋 Granular`) to support auditability and eliminate double-counting ambiguities.

## Scope

### Included
- **Task 1: Query & Helper Resolver Verification**
  - Ensure `spkService.getChangeOrders` or Supabase query fetches `change_order_items` with `package_source_id`, `package_name`, `notes`, and `product_packages(id, name)`.
  - Implement `getChangeOrderItemSource(item)` helper to resolve package names from direct fields, relations, or note prefixes (`Bagian dari paket: `), falling back to Granular.
- **Task 2: Snapshot Table UI Enhancement in AmendmentManager**
  - Insert `SUMBER / PAKET` column header between `ITEM TYPE` and `ALOKASI WBS`.
  - Render stylized badges:
    - Package: `[ 📦 Paket: Nama Paket ]` (amber badge).
    - Granular: `[ 📋 Granular ]` (slate badge).
  - Adjust table `colSpan` for empty state (8 -> 9).
- **Task 3: Automated Testing & Quality Gate Verification**
  - Add unit/component tests in `src/components/__tests__/AmendmentManager.test.tsx` verifying the presence and correct badge rendering for both package items and granular items in the snapshot table.
  - Run linter (`npx oxlint`), TypeScript verification (`tsc -b`), and full test suite (`npm test`).

### Explicitly Excluded
- Modifying warehouse inventory reservation logic or material requisition schema.
- Changing draft item creation flow in the left builder panel.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Update Change Order query & source helper in `spkService.ts` and `AmendmentManager.tsx` | Antigravity | ✅ Completed | 0.5h |
| 2. Add `SUMBER / PAKET` column header and badges to snapshot table in `AmendmentManager.tsx` | Antigravity | ✅ Completed | 0.5h |
| 3. Add tests and verify quality gates (`npm test`, `npx oxlint`, `npm run build`) | Antigravity | ✅ Completed | 0.5h |

## Daily Log

### 2026-10-24
- Initialized Sprint 83.
- Archived Sprint 82 to `.gsd/sprints/sprint-82-comprehensive-profit-segregation-across-rab-co-and-financial-reports.md`.
- Implemented Task 1:
  - Updated `ChangeOrderItemRecord` in `src/types/database.ts` with `product_packages?: { id: string; name: string } | null;`.
  - Updated `spkService.getChangeOrders` in `src/services/spkService.ts` to include `product_packages(id, name)` with defensive fallback to `change_order_items(*)`.
  - Implemented and exported `getChangeOrderItemSource(item, packagesList)` in `src/components/AmendmentManager.tsx` with resolution across `package_name`, `product_packages`, `notes` (`Bagian dari paket: ` or `[Paket: ...]`), and packages list lookup.
- Implemented Task 2:
  - Updated `AmendmentManager.tsx` snapshot table header (`<thead>`) to include `Sumber / Paket` between `Item Type` and `Alokasi WBS`.
  - Rendered `[ 📦 Paket: Nama Paket ]` amber badge and `[ 📋 Granular ]` slate badge in table rows (`<tbody>`).
  - Adjusted empty state row `colSpan` to 9.
- Implemented Task 3:
  - Added 8 automated tests in `src/components/__tests__/AmendmentManager.test.tsx` verifying helper resolution and UI snapshot table column ordering, badges, and empty states.
  - Verified TypeScript compilation: 0 errors (`tsc --noEmit`).
  - Verified Vitest: 61 suites, 437 tests passing (100% green).
  - Verified Production Build: `npm run build` completed cleanly in 410ms.
