# Sprint 80 — Add Source Package / Granular Origin Column to RAB Calculator Table

> **Duration**: 2026-10-23 to 2026-10-24
> **Status**: Completed

## Goal
Add a dedicated "SUMBER / PAKET" origin column to the RAB Calculator table in `/service-advisor` to clearly distinguish items generated from product assembly packages (`[ 📦 Paket: Nama Paket ]`) from items entered manually/granularly (`[ 📋 Granular ]`), ensuring package metadata persistence and syncing origin information to XLSX export and PDF quotation views.

## Scope

### Included
- **Task 1: Package Metadata Persistence in RAB Items**
  - Updated `PackageAllocationModal.tsx` (`RabItemPayload` interface and `handleApply` payload generation) to include `package_name: packageData.name` and `package_id: packageData.id`.
  - Updated `RabCalculator.tsx`:
    - In `handleApplyPackageAllocation`, recorded `package_name: selectedPackage.name`, `packageName: selectedPackage.name`, `packageId: pkgId`, and notes fallback `Paket: ${selectedPackage.name}` on each item.
    - In `handleAddLaborItem` and `handleAddItem`, ensured granular items explicitly set `package_name: null`, `packageName: null`, `packageId: undefined`.
  - Updated `rabService.ts`:
    - Extended `DbRabItemRecord` and `RabItem` with `package_name?: string | null` and `packageName?: string | null`.
    - In `loadRabItems`, mapped and resolved `package_name` (from `dbItem.package_name`, `product_packages.name`, or `notes`).
    - In `insertRabItems` and `saveFullRabEstimation`, accept and persist `package_name` with defensive PostgreSQL 42703 column fallback retry.
  - Added database migration `20261023030000_add_package_name_to_rab_items.sql` with column addition and backfill from `product_packages`.
- **Task 2: UI Table Header & Row Origin Column in `RabCalculator.tsx`**
  - Added table header `<th className="px-3 py-3 text-left">Sumber / Paket</th>` positioned immediately between `Description` and `Type`.
  - Rendered row cell for each item displaying:
    - `[ 📦 Paket: Nama Paket ]` (amber badge `bg-amber-950/70 text-amber-400 border border-amber-800/80`) if the item originates from an assembly package (via direct `package_name`, `packageName`, `packageId` relational lookup, or `notes` fallback).
    - `[ 📋 Granular ]` (slate/neutral badge `bg-slate-800/80 text-slate-300 border border-slate-700/80`) for loose/granular items.
- **Task 3: Export Helpers Synchronization (XLSX & PDF) in `rabExport.ts`**
  - Extended `RabExportItem` interface with `package_name?: string | null`, `packageName?: string | null`, `packageId?: string | null`, `notes?: string | null`.
  - Created `getRabItemSourceOrigin` helper with case-insensitive package and notes resolution.
  - Updated `exportRabToExcel`: included "Sumber / Paket" column between "Deskripsi" and "Tipe" in worksheet header and row data, correctly offsetting summary totals.
  - Updated `printRabQuotation`: displayed package origin badge or subtle subtext (`📦 Paket: ...` or `📋 Granular`) in the component description cell.
- **Task 4: Testing & Quality Gate**
  - Added component tests in `src/components/__tests__/RabCalculatorOrigin.test.tsx` verifying column rendering, package badges, and granular badges.
  - Added unit tests in `src/utils/__tests__/rabExport.test.ts` verifying Excel worksheet columns and PDF quotation rendering.
  - Passed full verification: Vitest test suite (60 test suites, 415 tests passing), `tsc -b`, and `npm run build`.

### Explicitly Excluded
- Modifying warehouse requisitions or cashier billing workflows (already implemented in prior sprints).
- Altering existing WBS stage allocation calculations.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Ensure package metadata persistence in `PackageAllocationModal.tsx`, `RabCalculator.tsx`, `rabService.ts`, and SQL migration | Antigravity | ✅ Completed | 0.5h |
| 2. Add "SUMBER / PAKET" column and badges to `RabCalculator.tsx` | Antigravity | ✅ Completed | 0.5h |
| 3. Synchronize package origin to Excel export and PDF quotation in `rabExport.ts` | Antigravity | ✅ Completed | 0.5h |
| 4. Write automated tests and verify complete quality gate (Vitest, Oxlint, TSC, Build) | Antigravity | ✅ Completed | 0.5h |

## Daily Log

### 2026-10-23
- Archived Sprint 79 into `.gsd/sprints/sprint-79-fix-false-required-field-validation-on-change-order-submission.md`.
- Initialized Sprint 80 for adding Source Package / Granular Origin column to RAB Calculator table.
- Task 1 completed:
  - Created SQL migration `20261023030000_add_package_name_to_rab_items.sql` with column addition and backfill from `product_packages`.
  - Updated `PackageAllocationModal.tsx` to include `package_name` and `package_id` in `RabItemPayload` and payload emission.
  - Updated `rabService.ts` to support `package_name` and `packageName` on `DbRabItemRecord` and `RabItem`, resolved origin in `loadRabItems`, and added defensive 42703 fallback in `insertRabItems` and `saveFullRabEstimation`.
  - Updated `RabCalculator.tsx` to persist package metadata on package items and null on granular items.
- Task 2 completed:
  - Added `SUMBER / PAKET` column header between `DESCRIPTION` and `TYPE` in the estimation table.
  - Rendered `[ 📦 Paket: <Nama Paket> ]` (amber badge) and `[ 📋 Granular ]` (slate badge) on table rows.
- Task 3 completed:
  - Updated `src/utils/rabExport.ts`: added `package_name`, `packageName`, `packageId`, and `notes` to `RabExportItem`.
  - Added "Sumber / Paket" column between "Deskripsi" and "Tipe" in `exportRabToExcel`.
  - Added subtle subtext (`📦 Paket: ...` or `📋 Granular`) in `printRabQuotation`.
- Task 4 completed:
  - Created `src/utils/__tests__/rabExport.test.ts` (7 tests passing).
  - Created `src/components/__tests__/RabCalculatorOrigin.test.tsx` (6 tests passing).
  - Ran full test suite: 60 test suites, 415 tests passing (100% green).
  - Validated production bundle build: `npm run build` succeeded in 447ms.
