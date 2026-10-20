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
| Correct spk.vehicle_plate column reference in billingService and related files | Claude | ⬜ Todo | — |
| Harden html2pdf export in DpReceiptPrintModal with style proxy and onclone cleanup | Claude | ⬜ Todo | — |
| Update and add unit tests for billingService and DpReceiptPrintModal | Claude | ⬜ Todo | — |
| Verify Vitest suite, Oxlint, and TypeScript production build | Claude | ⬜ Todo | — |

## Daily Log

### 2026-10-20
- Sprint created
