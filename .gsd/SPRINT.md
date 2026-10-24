# Sprint 91 — Deduplicate Rab Items and Enforce Client and Query-Level Uniqueness

> **Duration**: 2026-10-24 to 2026-10-24
> **Status**: In Progress

## Goal
Clean up duplicate `rab_items` in PostgreSQL via SQL migration, enforce query and client-level deduplication using composite keys across `RabCalculator.tsx` and `RabPerubahanTab.tsx`, and establish UI debounce and mutation locks on allocation saving to permanently eliminate double-submission and duplicated material/labor/overhead rows for SPK-3093 and all active/draft projects.

## Scope

### Included
- **Task 1: SQL Database Migration (`supabase/migrations/20261024050000_deduplicate_rab_items.sql`)**
  - Create migration script using `ROW_NUMBER() OVER (PARTITION BY rab_estimation_id, package_id, material_id, description, wbs_category, item_type, quantity, unit_price, cost_price ORDER BY created_at ASC, id ASC)` to delete duplicate rows.
  - Safe against nulls using `COALESCE`.
- **Task 2: Deduplication Helper & Service Integration (`src/utils/rabDeduplication.ts` & `src/services/rabService.ts`)**
  - Implement pure utility `deduplicateRabItems` with composite key hashing: `rab_estimation_id / spk_id + package_id + material_id + description + wbs + type + qty + unitPrice + costPrice`.
  - Integrate deduplication into `rabService.loadRabItems(spkId)` so all callers receive sanitised, unique item lists even if duplicate rows exist in backend.
  - Comprehensive unit tests in `src/utils/__tests__/rabDeduplication.test.ts`.
- **Task 3: Client-Level Deduplication in RAB Views (`RabCalculator.tsx` & `RabPerubahanTab.tsx`)**
  - Enforce deduplication in `RabCalculator.tsx` during initial fetch and state updates.
  - Enforce deduplication in `RabPerubahanTab.tsx` across `rabItemsRaw` and consolidated change order items.
- **Task 4: UI Debounce & Mutation Lock Against Double-Submission (`RabCalculator.tsx` & `PackageAllocationModal.tsx`)**
  - Install mutation lock (`isSubmitting` / `isApplyingAllocation`) in `PackageAllocationModal.tsx` and `RabCalculator.tsx`.
  - Disable buttons during save/allocation apply and debounce rapid clicks.
  - Coordinate direct mutations with auto-save debounce so concurrent `insertRabItems` and `saveFullRabEstimation` do not race and duplicate records.
- **Task 5: Automated Testing, Linting & Build Verification**
  - Add unit tests for deduplication utilities, component tests for `RabCalculator` and `RabPerubahanTab`.
  - Verify zero linter warnings (`oxlint`), clean build (`tsc -b && vite build`), and 100% passing tests.

### Explicitly Excluded
- Modifying finalized past invoice receipts in `invoices` table.
- Altering unrelated warehouse requisition approvals or mandor floor tracking workflows.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| Task 1: Create SQL migration `20261024050000_deduplicate_rab_items.sql` | Claude | ⬜ Todo | 0.25 |
| Task 2: Create pure deduplication utility `rabDeduplication.ts` with unit tests and integrate into `rabService.ts` | Claude | ⬜ Todo | 0.5 |
| Task 3: Enforce client-level deduplication in `RabCalculator.tsx` and `RabPerubahanTab.tsx` | Claude | ⬜ Todo | 0.5 |
| Task 4: Implement mutation lock and click debounce in `PackageAllocationModal.tsx` and `RabCalculator.tsx` | Claude | ⬜ Todo | 0.5 |
| Task 5: Automated testing, verification, lint check, and production build | Claude | ⬜ Todo | 0.5 |

## Daily Log

### 2026-10-24
- Sprint 90 archived to `.gsd/sprints/sprint-90-implement-itemized-assembly-package-vs-granular-profit-segregation-in-rab-perubahan-and-job-profitability.md`.
- Sprint 91 initialized: Deduplicate Rab Items and Enforce Client and Query-Level Uniqueness.
- Root cause identified: Concurrent package allocation insertion and debounced auto-save without mutation locks in `RabCalculator.tsx`, combined with lack of composite key deduplication at fetching and rendering layers in `RabCalculator.tsx` and `RabPerubahanTab.tsx`.
