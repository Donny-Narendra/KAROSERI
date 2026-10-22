# Sprint 72 — Align Warehouse Mandor Requests Layout by Inserting Recent Material Issues to Right Sidebar

> **Duration**: 2026-10-22 to 2026-10-23
> **Status**: Completed

## Goal
Align the `/warehouse` dashboard layout with `/service-advisor` by relocating the "Recent Material Issues" component from the bottom of the main content column into the right sidebar, positioning it cleanly between "Filter Berdasarkan SPK" and "Riwayat Approval & Stok", reactively linked to the selected SPK filter and equipped with quick material search.

## Scope

### Included
- Relocate `<RecentMaterialIssues />` in [`WarehouseDashboard.tsx`](file:///c:/KAROSERI/src/pages/WarehouseDashboard.tsx) from the left column into the right sidebar between `<SpkFilterListBox />` and `<RecentApprovedMaterials />`.
- Ensure reactive data synchronization with `selectedSpkFilter` and `refreshKey`.
- Adjust empty state message in [`RecentMaterialIssues.tsx`](file:///c:/KAROSERI/src/components/RecentMaterialIssues.tsx) to accurately refer to the filter list "di atas" rather than "di panel kanan".
- Add max-height scroll container (`max-h-[380px] overflow-y-auto`) and flexible search box width to the table in [`RecentMaterialIssues.tsx`](file:///c:/KAROSERI/src/components/RecentMaterialIssues.tsx) for optimal sidebar display ergonomics.
- Add and verify unit/integration tests for sidebar composition in [`WarehouseDashboardPartiallyIssued.test.tsx`](file:///c:/KAROSERI/src/pages/__tests__/WarehouseDashboardPartiallyIssued.test.tsx) and component tests in [`RecentMaterialIssues.test.tsx`](file:///c:/KAROSERI/src/components/__tests__/RecentMaterialIssues.test.tsx).

### Explicitly Excluded
- Database schema changes (no migrations required).
- Modifying backend endpoints or RPC functions.
- Redesigning unrelated tabs (e.g. Manajemen Inventaris or Paket Barang Jadi).

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Refactor right sidebar layout in `WarehouseDashboard.tsx` | Antigravity | ✅ Done | 1h |
| 2. Optimize `RecentMaterialIssues.tsx` styling & empty state copy for sidebar | Antigravity | ✅ Done | 0.5h |
| 3. Add regression tests for right sidebar component ordering & reactivity | Antigravity | ✅ Done | 0.5h |
| 4. Verification and quality checks (Vitest, Oxlint, TypeScript) | Antigravity | ✅ Done | 0.5h |

## Daily Log

### 2026-10-22
- Sprint created.
- Inspected interface discrepancies between `/service-advisor` and `/warehouse`.
- Identified that `<RecentMaterialIssues />` was misplaced in the left column (`lg:col-span-2`) of `WarehouseDashboard.tsx`, leaving the right sidebar without the recent material issues table.
- Relocated `<RecentMaterialIssues />` into the right sidebar of `WarehouseDashboard.tsx`, placing it directly between `<SpkFilterListBox />` and `<RecentApprovedMaterials />` with reactive binding to `selectedSpkFilter` and `refreshKey`.
- Updated `RecentMaterialIssues.tsx`:
  - Adjusted empty state copy to refer to the filter list "di atas" (above) rather than "di panel kanan".
  - Added `max-h-[380px] overflow-y-auto` scroll wrapper to table rows to prevent unbounded vertical stretching in the sidebar.
  - Made the search box input width responsive (`w-40 sm:w-52`).
- Added layout and reactive selection tests in `src/pages/__tests__/WarehouseDashboardPartiallyIssued.test.tsx`.
- Created comprehensive unit tests in `src/components/__tests__/RecentMaterialIssues.test.tsx` verifying empty state, reactive fetching, and material search filtering.
- Synchronized query fetching in `RecentMaterialIssues.tsx` & `WarehouseDashboard.tsx`:
  - Added `selectedSpkId` prop support and computation in `WarehouseDashboard.tsx`.
  - Filter by `spk_id === selectedSpkId` whenever an active SPK is selected.
  - When no active SPK is selected (e.g. 'ALL'), fetch the latest global transactions (limit 50).
  - Ordered query results descending by `issued_at` / `created_at`.
  - Always active search input allowing filtering by material name, unit, or SPK number.
- Updated unit test suite (`RecentMaterialIssues.test.tsx` and `WarehouseDashboardPartiallyIssued.test.tsx`) — 55 passed test files, 350 passed tests.
- Oxlint: 0 warnings, 0 errors. TypeScript: clean. Production build: 499ms.

## Retrospective (2026-10-22)

### What Went Well
- Successfully aligned the layout across `/warehouse` and `/service-advisor`.
- Component unit tests and integration tests written and passed.

### What Could Improve
- In production runtime, PostgREST query errors occurred when requesting non-existent fields `created_at` from `inventory_transactions` or `spk_number` from `spk`, causing empty table states. Addressed in Sprint 73.

### Action Items
- [x] Launch Sprint 73 to fix empty table querying and harden dual SPK matching.
