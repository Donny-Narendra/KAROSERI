## Current Position
- **Sprint**: Sprint 24 — Implement Labor/Jasa Item Entry Toggle in Service Advisor RAB Calculator
- **Status**: Sprint in progress 🚀
- **Milestone**: Core Business Recommendations Hardening — Enterprise Production Readiness

## Last Session Summary
Sprint 23 Completed & Sprint 24 Initialized (2026-10-17).
- Archived Sprint 23 to `.gsd/sprints/sprint-23-fix-zero-labor-budget-and-enable-labor-item-entry-in-rab-calculator.md`.
- Initialized Sprint 24 to implement an intuitive item entry toggle ("Bahan Baku (Material)" vs "Jasa / Tukang (Labor)") in `RabCalculator.tsx` with dedicated labor inputs (Name, WBS 1-5 dropdown, Estimated Cost, Scope/Notes) and automatic WBS labor budget aggregation.

## Active Plan & Waves
- Task 1: Align schema & types (`unit`, `notes` in `rab_items` & `database.ts`).
- Task 2: Implement toggle switch & dedicated Labor form in `RabCalculator.tsx`.
- Task 3: Connect labor payload submission & editing to state & Supabase upsert.
- Task 4: Update estimation table badges (`[ MATERIAL ]`, `[ JASA / TUKANG ]`) & WBS cost summary.
- Task 5: Update automated tests, verify `npm test`, `npm run lint`, and `npm run build`.

## Blockers
None.
