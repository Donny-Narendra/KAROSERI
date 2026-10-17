## Current Position
- **Sprint**: Sprint 24 — Implement Labor/Jasa Item Entry Toggle in Service Advisor RAB Calculator
- **Status**: Sprint completed ✅
- **Milestone**: Core Business Recommendations Hardening — Enterprise Production Readiness

## Last Session Summary
Sprint 24 Completed (2026-10-17).
- Archived Sprint 24 to `.gsd/sprints/sprint-24-implement-labor-jasa-item-entry-toggle-in-service-advisor-rab-calculator.md`.
- Applied PostgreSQL schema migration `20261017010000_add_unit_notes_to_rab_items.sql` to add `unit` and `notes` to `public.rab_items`.
- Updated TypeScript interface `RabItemRecord` in `src/types/database.ts`.
- Upgraded `RabCalculator.tsx`:
  - Added modern toggle tabs switch: "Bahan Baku (Material)" (Default), "Jasa / Tukang (Labor)", and "Overhead".
  - Created dedicated Labor input form with required inputs: Nama Jasa, Tahapan WBS dropdown (WBS 1 to WBS 5), Estimasi Biaya Jasa / Upah (Rp), and optional Scope Pekerjaan textarea.
  - Automatically hidden material inventory dropdown and waste factor when in Labor mode.
  - Handled seamless Add and Edit workflows ("Tambah Jasa ke RAB" vs "Update Jasa ke RAB").
  - Mapped payload to `item_type = 'LABOR'`, `material_id = null`, `quantity = 1`, `unit = 'lot'`, and `wbs_category = stage`.
  - Added distinct visual badges: `[ MATERIAL ]` (cyan/blue) and `[ JASA / TUKANG ]` (orange/amber).
  - Added detailed per-WBS summary card breakdown (Material, Jasa, Total) in estimation footer.
- Updated component test suite `src/components/__tests__/RabCalculatorLabor.test.tsx` (6 tests).
- Verified empirical database integrity on PostgreSQL, verifying `item_type = 'LABOR'`, `material_id = null`, `unit_price = 500000`, `subtotal = 500000`, and `wbs_stage = 'WBS 2: Sasis/Rangka'`.
- Executed `npm test` (85/85 passing across 11 files), clean TypeScript compilation (`tsc -b`), zero linter errors (`npm run lint`), and successful production build (`npm run build`).

## Active Plan & Waves
All planned sprints, labor budget entry controls, and financial variance integrations have been successfully implemented and empirically verified.

## Blockers
None.
