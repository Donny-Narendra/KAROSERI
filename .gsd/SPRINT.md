# Sprint 40 — Mandor Floor Terminal Overhead Logging Module

> **Duration**: 2026-10-18 to 2026-10-18
> **Status**: Completed ✅

## Goal
Implement real-time factory overhead (FOH) actual logging module directly accessible from the Mandor floor terminal:
1. Extend `src/types/financialReports.ts` and `src/services/financialReportsService.ts` with `createSpkOverheadLog` and `deleteSpkOverheadLog`.
2. Build `src/components/SpkOverheadModal.tsx`:
   - Quick overhead presets tailored for karoseri operations:
     - "Oven Spray Booth & Gas"
     - "Listrik Mesin Las & Fabrikasi"
     - "Kompresor & Alat Pneumatik"
     - "Sewa Crane / Derek / Alat Angkat"
   - Real-time calculation (`frequency_qty * rate_per_unit = total_amount`).
   - Stage breakdown selection (`Pembongkaran`, `Sasis/Rangka`, `Dinding/Fabrikasi`, `Cat/Finishing`, `Kelistrikan/Hidrolik`).
   - Overhead log history table with deletion capability and total overhead spent summary.
3. Integrate into `src/components/WbsChecklist.tsx`:
   - Stage-level "Catat Overhead" button next to "SPK Borongan" and "Minta Material".
   - Global "Overhead (FOH)" header button for direct access.
   - Synchronize updates via `onWbsUpdated`.
4. Comprehensive unit test suite `src/components/__tests__/SpkOverheadModal.test.tsx` verifying:
   - Rendering modal dialog and SPK details.
   - Selecting presets and calculating live totals.
   - Submitting a new overhead log to Supabase.
   - Viewing existing records and deleting an entry.
5. Verification via Vitest (18 test files, 137 tests passing 100%), `tsc -b`, and Vite build.

## Scope

### Included
- Service layer CRUD: `getSpkOverheadLogs`, `createSpkOverheadLog`, `deleteSpkOverheadLog`.
- Component: `src/components/SpkOverheadModal.tsx`.
- WBS checklist integration: `src/components/WbsChecklist.tsx`.
- Unit tests: `src/components/__tests__/SpkOverheadModal.test.tsx`.

### Explicitly Excluded
- Oxlint code hygiene cleanup (scheduled for Sprint 41).

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Update `src/types/financialReports.ts` and `src/services/financialReportsService.ts` | Antigravity | ✅ Done | 0.2h |
| 2. Implement `src/components/SpkOverheadModal.tsx` | Antigravity | ✅ Done | 0.4h |
| 3. Integrate into `src/components/WbsChecklist.tsx` | Antigravity | ✅ Done | 0.2h |
| 4. Create unit tests `src/components/__tests__/SpkOverheadModal.test.tsx` | Antigravity | ✅ Done | 0.3h |
| 5. Full test verification, TypeScript check, and Vite build | Antigravity | ✅ Done | 0.2h |

## Daily Log

### 2026-10-18
- Initialized Sprint 40 for Mandor Floor Terminal Overhead Logging Module.
- Inspected table schema `spk_overhead_logs` created in migration `20261017010000_job_order_costing_overhead.sql`.
- Added `CreateSpkOverheadLogPayload` contract in `src/types/financialReports.ts`.
- Implemented `createSpkOverheadLog`, `deleteSpkOverheadLog`, and typed `getSpkOverheadLogs` in `src/services/financialReportsService.ts`.
- Created `src/components/SpkOverheadModal.tsx` with presets, live calculation, form submission, and history table with deletion.
- Integrated `SpkOverheadModal` into `src/components/WbsChecklist.tsx` with global header button and per-stage action buttons.
- Created `src/components/__tests__/SpkOverheadModal.test.tsx` with 4 test scenarios passing cleanly.
- Executed full test suite: 18 test files, 137 tests passing (100%).
- Verified `npx tsc -b` and production bundle built cleanly in 532ms.
