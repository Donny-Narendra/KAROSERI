# Sprint 21 — Audit Log Monitoring for Cancelled SPKs

> **Duration**: 2026-10-17 to 2026-10-17
> **Status**: Completed ✅

## Goal
Implement a comprehensive, audit-compliant Cancelled SPK Monitoring system in the Admin / Owner dashboard. This provides real-time visibility into why, when, and by whom SPKs were cancelled, displaying exact cancellation reasons, user attribution, lost revenue/estimation impact, search/filtering, and CSV audit export.

## Scope

### Included
- **Service Layer & Data Types (`src/services/spkService.ts`)**:
  - Define strict interface `CancelledSpkAuditRecord` with `cancellation_reason`, `cancelled_at`, and `cancelled_by_profile` (`id`, `full_name`, `role`).
  - Add `fetchCancelledSpkAuditLogs()` in `spkService.ts` to query Supabase with `profiles!cancelled_by` join.
- **Dedicated Component (`src/components/CancelledSpkAuditLog.tsx`)**:
  - Executive KPI cards for cancellations:
    1. Total SPK Dibatalkan (All-time)
    2. Estimasi Nilai Dibatalkan (Lost Potential Revenue)
    3. Pembatalan 30 Hari Terakhir
  - Interactive search and filtering by SPK number, client name, vehicle plate, or cancellation keyword.
  - Audit table displaying SPK No, Client, Vehicle Plate, Cancellation Timestamp (`cancelled_at`), Executor (`cancelled_by_profile.full_name` & role badge), and Cancellation Reason (`cancellation_reason`).
  - Export CSV button for external audit documentation.
  - Detail dialog modal to view complete audit snapshot.
- **Dashboard Integration (`src/pages/AdminDashboardPage.tsx`)**:
  - Add navigation tab `cancellations` ("Audit Pembatalan") alongside `dashboard` and `bom`.
  - Fix and upgrade the quick preview cancelled SPK table on the main dashboard tab to accurately display `cancellation_reason` and `cancelled_at`.
- **Automated Tests (`src/components/__tests__/CancelledSpkAuditLog.test.tsx`)**:
  - Unit and component tests for KPI calculations, table rendering, search filtering, empty states, and CSV export (6 tests).
- **Verification & Documentation**:
  - `npx tsc -b` clean compile.
  - `npm run lint` 0 errors.
  - `npm test` 100% pass across all 8 test suites (66 tests).
  - Update `.gsd/ARCHITECTURE.md` resolving the "Audit Log Monitoring for Cancelled SPKs" technical debt item.

### Explicitly Excluded
- Modifying SPK creation, WBS execution, or billing payment workflows.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Add `CancelledSpkAuditRecord` and `fetchCancelledSpkAuditLogs()` in `spkService.ts` | Antigravity | ✅ Done | 0.3h |
| 2. Create `CancelledSpkAuditLog.tsx` component with KPIs, filters, audit table, and CSV export | Antigravity | ✅ Done | 0.5h |
| 3. Integrate audit log view and navigation tabs into `AdminDashboardPage.tsx` | Antigravity | ✅ Done | 0.4h |
| 4. Create automated component tests in `CancelledSpkAuditLog.test.tsx` | Antigravity | ✅ Done | 0.4h |
| 5. Validate full test suite, linting, build, and update documentation | Antigravity | ✅ Done | 0.2h |

## Daily Log

### 2026-10-17
- Archived Sprint 20 to `.gsd/sprints/sprint-20-eliminate-any-type-casts-and-enforce-strict-typescript-contracts.md`.
- Initialized and completed Sprint 21: Audit Log Monitoring for Cancelled SPKs.
- Added `CancelledSpkAuditRecord` and `fetchCancelledSpkAuditLogs()` to `src/services/spkService.ts` with `profiles!cancelled_by` join.
- Created `CancelledSpkAuditLog.tsx` with executive KPI cards, search filter, responsive audit table, detail modal, and CSV export.
- Integrated `cancellations` tab into `AdminDashboardPage.tsx` and upgraded quick cancellation table with accurate `cancellation_reason` and `cancelled_by_profile`.
- Created automated component test suite in `CancelledSpkAuditLog.test.tsx` (6 tests). All 66 tests passing across 8 suites.
- Validated `npx tsc -b` (0 errors), `npm run lint` (0 errors), `npm run build` (success).
- Updated `.gsd/ARCHITECTURE.md` and `.gsd/STACK.md` marking the technical debt as resolved.
