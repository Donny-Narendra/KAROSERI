# Sprint 4 — Enforce Hard-Gate Validation on Mandor Final QC Submission

> **Duration**: 2026-10-15 to 2026-10-15
> **Status**: Completed

## Goal
Enforce strict hard-gate validation on the Mandor Terminal Final QC Inspection form (`QcInspectionForm.tsx`), preventing submission when inspection parameters are incomplete or when any WBS active stage has not passed or remains incomplete, ensuring SPKs cannot be marked as QC PASS prematurely or erroneously saved with QC FAIL status.

## Scope

### Included
- Pre-condition Checks (Readiness Evaluation):
  - Evaluate checklist readiness: all 4 final QC parameters (`shower_test`, `uji_hidrolik`, `dimensi_kendaraan`, `uji_kelistrikan`) must be checked.
  - Evaluate WBS stage status: check active `wbs_checklists` for the SPK to ensure no category is `FAIL` or incomplete (`progress_percentage < 100` or status `FAIL`).
  - Wire reactive real-time updates between `WbsChecklist` and `QcInspectionForm` so changes in WBS immediately reflect in QC readiness.
- Hard-Gate Submission Lock:
  - Disable "Submit Final QC" button when preconditions are not met (`disabled={!isAllPassed}` or `disabled={!isReadyToPass}`).
  - Provide visual disabled state (`opacity-50 cursor-not-allowed bg-surface border border-border text-text-muted`).
  - Add guard clause in `handleSubmit` preventing any DB execution if not all requirements are passed.
  - Display helpful warning notice / tooltip near the button guiding the Mandor on what remains to be completed.
- Dynamic Feedback UI Banner:
  - Red / Rose warning banner (`bg-rose-950/60 border border-rose-800 text-rose-300`) when incomplete: `Current Status: INCOMPLETE / FAIL` with list of pending items or unfulfilled WBS stages.
  - Green / Emerald ready banner (`bg-emerald-950/60 border border-emerald-800 text-emerald-300`) when all criteria are met: `Current Status: READY TO PASS`.
  - When already submitted and passed: Keep clean `Current Status: PASS` indicator.
- Verification:
  - Build validation (`npm run build`).
  - Linter check (`npm run lint`).

### Explicitly Excluded
- Database schema changes.
- Modifying non-Mandor workflows.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| Add WBS status tracking and pre-condition validation logic in `QcInspectionForm.tsx` | Antigravity | ✅ Done | 0.5h |
| Wire WBS update listener between `WbsChecklist` and `QcInspectionForm` in `MandorDashboard.tsx` | Antigravity | ✅ Done | 0.5h |
| Implement hard-gate submission guard, disabled button state, and warning notices | Antigravity | ✅ Done | 0.5h |
| Implement dynamic Red/Green feedback banner under Final QC Inspection header | Antigravity | ✅ Done | 0.5h |
| Verify with TypeScript build (`npm run build`) and lint (`npm run lint`) | Antigravity | ✅ Done | 0.5h |

## Daily Log

### 2026-10-15
- Sprint 4 created from user request.
- Archived Sprint 3 to `.gsd/sprints/sprint-3-refactor-mandor-terminal-layout.md`.
- Analyzed `QcInspectionForm.tsx`, `WbsChecklist.tsx`, and `MandorDashboard.tsx`.
- Updated `src/components/WbsChecklist.tsx`:
  - Added `onWbsUpdated?: () => void` to `WbsChecklistProps`.
  - Invoked `onWbsUpdated?.()` upon saving WBS progress/status updates, uploading photos, and removing photos.
- Updated `src/pages/MandorDashboard.tsx`:
  - Added `wbsUpdateKey` state and `handleWbsUpdated` callback to synchronize WBS progress changes directly into `QcInspectionForm`.
- Updated `src/components/QcInspectionForm.tsx`:
  - In `fetchQcData`, parallelized fetch of `spk` and `wbs_checklists` for the active `spkId`.
  - Added `wbsValidation` memo analyzing all 5 categories (`Pembongkaran`, `Sasis/Rangka`, `Dinding/Fabrikasi`, `Cat/Finishing`, `Kelistrikan/Hidrolik`) for `failedCategories` and `incompleteCategories`.
  - Added `isChecklistAllChecked` requiring all 4 items (`shower_test`, `uji_hidrolik`, `dimensi_kendaraan`, `uji_kelistrikan`).
  - Set `isAllPassed = isChecklistAllChecked && wbsValidation.isWbsReady`.
  - Added guard clause in `handleSubmit` preventing any DB execution or erroneous saving of `qc_status: 'FAIL'` when preconditions are not met.
  - Disabled "Submit Final QC" button with styling `opacity-50 cursor-not-allowed` and helper warning text below the button.
  - Implemented dynamic feedback banner:
    - Red (`bg-rose-950/60 border border-rose-800 text-rose-300`) with `HARD-GATE LOCKED` badge and bulleted pending requirements when criteria are incomplete.
    - Green (`bg-emerald-950/60 border border-emerald-800 text-emerald-300`) with `SIAP SUBMIT` badge when `isAllPassed` is achieved.
    - Green verified badge (`Current Status: PASS`) when the SPK was already submitted and approved.
- Verified build (`npm run build`) and lint (`npm run lint`), achieving 0 errors.
