# Sprint 31 — Update Overhead Label Terminology in RAB Calculator

> **Duration**: 2026-10-17 to 2026-10-17
> **Status**: Completed ✅

## Goal
Update UI label terminology in the Overhead section of RabCalculator (`/service-advisor`) from `DAYS (HARI KERJA)` and `BAY RATE / HARI` to `FREKWENSI DALAM PROYEK INI` and `BAY RATE / FREKWENSI` to support flexible event/frequency-based overhead cost accounting without altering underlying calculations.

## Scope

### Included
- **UI Label Refactor in `RabCalculator.tsx`**:
  - Update `DAYS (HARI KERJA)` label to `FREKWENSI DALAM PROYEK INI`.
  - Update `BAY RATE / HARI` label to `BAY RATE / FREKWENSI`.
  - Ensure input accessibility (`htmlFor`, `id`, `onFocus`, `onMouseUp`, `step="any"`).
  - Dynamic submit button text in Overhead mode: `Tambah Overhead ke RAB`.
- **Unit Testing**:
  - Create dedicated component tests in `src/components/__tests__/RabCalculatorOverhead.test.tsx` for Overhead label rendering, input attributes (`step="any"`, `min="0"`, `onFocus` auto-select), and decimal/rate calculation behavior (`0.5` and `2` frequency with rate `1600000`).
- **Verification**:
  - 107 Vitest unit tests passing across 13 test files.
  - Oxlint linter check passing with 0 errors.
  - Vite production bundle build passing cleanly.

### Explicitly Excluded
- Database schema changes.
- Altering core calculation formulas (`item.qty * item.unitPrice`, `overhead_hours / 8`, etc.).
- Modifying Material or Labor tabs.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Update Overhead labels in `RabCalculator.tsx` | Antigravity | ✅ Done | 0.2h |
| 2. Add unit tests for Overhead mode in `RabCalculator` | Antigravity | ✅ Done | 0.3h |
| 3. Run validation (Vitest, Oxlint, Vite build) | Antigravity | ✅ Done | 0.2h |

## Daily Log

### 2026-10-17
- Initialized Sprint 31: Update Overhead Label Terminology in RAB Calculator.
- Archived Sprint 30 to `.gsd/sprints/sprint-30-add-allocation-status-column-to-labor-wbs-grid-in-rab-calculator.md`.
- Updated Overhead input labels in `src/components/RabCalculator.tsx`:
  - `DAYS (HARI KERJA)` -> `FREKWENSI DALAM PROYEK INI`.
  - `BAY RATE / HARI` -> `BAY RATE / FREKWENSI`.
- Enhanced label accessibility by adding `htmlFor="overhead-bay-rate-input"` and matching `id="overhead-bay-rate-input"`.
- Set submit button label conditionally to `Tambah Overhead ke RAB` when in Overhead mode.
- Created `src/components/__tests__/RabCalculatorOverhead.test.tsx` testing label updates, decimal precision input configuration, and calculation accuracy for frequency `0.5` and `2` at rate `1600000`.
- Verified 107/107 Vitest tests passing across all 13 test suites, Oxlint 0 errors, and clean production build with Vite.
