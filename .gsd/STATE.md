## Current Position
- **Sprint**: Sprint 33 — Filter SPK Borongan RAB Reference to Exclusively Show LABOR Items
- **Status**: Sprint completed ✅
- **Milestone**: Core Business Recommendations Hardening — Enterprise Production Readiness

## Last Session Summary
- Archived Sprint 32 to `.gsd/sprints/sprint-32-fix-decimal-allocation-sum-and-status-calculation-for-overhead-in-rab-calculator.md`.
- Implemented strict `item_type = 'LABOR'` query filter and in-memory filtering in `SpkBoronganPanel.tsx`, ensuring physical materials (e.g., `AMPLAS 100`) and overhead (e.g., `Listrik`) never appear in the Mandor SPK Borongan reference list.
- Refined panel header to "Panduan Pagu Jasa / Pekerjaan (RAB)" with badge `[ Khusus Jasa / Borongan ]`, updated column headers, helper text, and empty state messages.
- Created comprehensive unit tests in `src/components/__tests__/SpkBoronganPanel.test.tsx` (all 115 tests passing across 14 test suites).
- Verified production build (`tsc -b && vite build`) and commit `fix(mandor): filter spk borongan rab reference list to strictly require item_type = 'LABOR'`.

## Blockers
None.
