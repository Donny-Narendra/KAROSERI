# Sprint 57 — Fix SPK vehicle_plate Column Reference and Resolve html2pdf CSS Parse Error

> **Duration**: 2026-10-20 to 2026-10-20
> **Status**: In Progress

## Goal
Fix Supabase select query calling non-existent column `spk.vehicle_number` to use `spk.vehicle_plate`, and resolve html2pdf.js / html2canvas CSSParsedDeclaration crash during DP receipt PDF export.

## Scope

### Included
- Correct `vehicle_number` column reference in `src/services/billingService.ts` and related interfaces/mappings.
- Harden `DpReceiptPrintModal.tsx` PDF download with computed style proxying (converting modern `oklch` / `color-mix` / `lab` CSS colors to standard RGB), `onclone` cleanup, and elegant fallback.
- Update and add unit tests for `billingService` and `DpReceiptPrintModal`.
- Verify Vitest suite, Oxlint, and TypeScript production build.

### Explicitly Excluded
- Database schema changes (the PostgreSQL `spk` table already uses `vehicle_plate`).
- Unrelated print modals or dashboards.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| Correct spk.vehicle_plate column reference in billingService and related files | Claude | ✅ Done | 0.5 |
| Harden html2pdf export in DpReceiptPrintModal with style proxy and onclone cleanup | Claude | ✅ Done | 0.5 |
| Update and add unit tests for billingService and DpReceiptPrintModal | Claude | ✅ Done | 0.5 |
| Verify Vitest suite, Oxlint, and TypeScript production build | Claude | ✅ Done | 0.5 |

## Daily Log

### 2026-10-20
- Sprint created.
- Removed non-existent `vehicle_number` from `fetchDPHistory` Supabase select query in `billingService.ts`, fixing PostgreSQL error 42703.
- Updated mappings in `KasirDashboard.tsx`, `PublicProgressTracking.tsx`, and `rabExport.ts` to prefer `vehicle_plate` and `vehicle_vin`.
- Extracted and implemented `convertColorToRgb` and `createStyleProxy` in `src/utils/pdfExportUtils.ts` to convert Tailwind v4 `oklch`, `lab`, `color-mix` values into valid RGB declarations during `html2canvas` traversal.
- Hardened `handleDownloadPdf` in `DpReceiptPrintModal.tsx` with onclone cleanup (stripping `boxShadow`), options configuration, and elegant fallback to `window.print()`.
- Added unit tests in `pdfExportUtils.test.ts` and `DpReceiptPrintModal.test.tsx`, plus column query assertions in `billingService.test.ts`.
- All 37 test suites (236 tests) passing 100%, 0 Oxlint errors/warnings, and clean production build.
