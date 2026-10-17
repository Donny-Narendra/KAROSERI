# Sprint 28 — Implement Inventory-driven Auto-Suggest Search for Labor/Jasa in RAB Calculator

> **Duration**: 2026-10-17 to 2026-10-17
> **Status**: Completed ✅

## Goal
Implement an inventory-driven auto-suggest search field for "NAMA JASA / PEKERJAAN TUKANG" in the Service Advisor RAB Calculator (`RabCalculator.tsx`), strictly filtered to master catalog items containing labor keywords (`jasa`, `ongkos`, `borongan`, `tukang`, `upah`, `tenaga`) or category `jasa`/`labor`, automatically filling standard rates (`selling_price` or `cost_price`) while retaining custom input flexibility.

## Scope

### Included
- **Keyword-filtered Master Inventory Querying**:
  - Filter `materials` using `LABOR_KEYWORDS = ['jasa', 'ongkos', 'borongan', 'tukang', 'upah', 'tenaga']` and `category === 'jasa' | 'labor'`.
  - Exclude physical goods (e.g., steel plates, electrodes, consumables) from labor auto-suggest.
- **Auto-Suggest Search & Floating Dropdown**:
  - Auto-suggest input with focus/query triggers, keyboard navigation (ArrowUp, ArrowDown, Enter, Escape), and click-outside dismissal.
  - Floating suggestion list displaying item name, `[JASA]` badge, and standard rate (`Rp`).
  - Fallback prompt: *"Tidak ditemukan di master inventaris jasa. Tekan Enter untuk gunakan nama kustom."*
- **Auto-Fill & Custom Override**:
  - Selecting an item populates `name` and auto-fills `estimatedCost` with `selling_price || cost_price || unit_price`.
  - Allows manual adjustment of cost or typing arbitrary custom task names.
- **Automated Testing & Quality**:
  - Add test suite in `RabCalculatorLabor.test.tsx` verifying labor auto-suggest filtering, physical items exclusion, and rate auto-population.
  - Run `npm test`, `npm run lint`, and `npm run build`.

### Explicitly Excluded
- Restricting users from creating custom ad-hoc labor items.
- Modifying warehouse inventory tables.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Add `category` to `Material` interface and define `LABOR_KEYWORDS` in `RabCalculator.tsx` | Antigravity | ✅ Done | 0.2h |
| 2. Implement auto-suggest search and dropdown in Labor form JSX | Antigravity | ✅ Done | 0.3h |
| 3. Add automated tests for labor auto-suggest filtering and auto-fill in `RabCalculatorLabor.test.tsx` | Antigravity | ✅ Done | 0.2h |
| 4. Validate with `npm test`, `npm run lint`, and `npm run build` | Antigravity | ✅ Done | 0.2h |

## Daily Log

### 2026-10-17
- Initialized Sprint 28: Implement Inventory-driven Auto-Suggest Search for Labor/Jasa in RAB Calculator.
- Added `category?: string` to `Material` interface in `src/services/inventoryService.ts`.
- Integrated `LABOR_KEYWORDS` filter and `availableLaborItems` / `filteredLaborItems` memoized states in `src/components/RabCalculator.tsx`.
- Built keyboard accessible (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`) floating suggestion dropdown showing standard selling/cost rate and `JASA` badge.
- Connected `handleSelectLaborItem` to auto-fill name and standard labor cost.
- Preserved fallback allowing custom non-catalog work names and custom rates.
- Added unit tests in `src/components/__tests__/RabCalculatorLabor.test.tsx` verifying strict labor keyword filtering, physical item exclusion, rate auto-fill, and fallback notice.
- Passed all 94 Vitest test cases across 11 test files, 0 linter errors, and verified production build with Vite.
