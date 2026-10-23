# Sprint 79 — Fix False Required Field Validation on Change Order Submission

> **Duration**: 2026-10-23 to 2026-10-24
> **Status**: Completed

## Goal
Decouple granular item builder form validation in the left panel from the final Change Order submission action in the right panel, preventing false-positive HTML5 validation errors (such as browser tooltip "Please enter a number" on unused left panel inputs) when submitting package-based or manually reviewed Change Orders.

## Scope

### Included
- `src/components/AmendmentManager.tsx`:
  - Added `noValidate` to `<form>` container to prevent native browser tooltips from blocking submission on hidden/inactive inputs.
  - Changed "Ajukan Change Order" button from `type="submit"` to `type="button"` with `onClick={handleSubmitFinalChangeOrder}`.
  - Removed HTML5 `required` attributes from left panel builder inputs:
    - Material inputs (`material-target-qty`, `unitPrice`, etc.)
    - Labor inputs (`labor-target-qty`, `unitPrice`, `LaborSearchAutocomplete`, etc.)
    - Overhead inputs (`overhead-description-input`, `overhead-target-qty`, `unitPrice`, etc.)
    - Description `<textarea>` (HTML5 `required` removed; validated in JS handler)
  - Enhanced validation on `handleAddOrUpdateItem` for the left builder: validates non-empty item name, target quantity > 0, complete WBS allocation match, and valid unit price (> 0).
  - Final Change Order submission validates document-level integrity:
    - Description & Justification must be non-empty.
    - Minimal 1 draft item in right review table (`draftItems.length > 0`).
    - Validates each draft item for non-empty name and positive quantity.
- `src/components/__tests__/AmendmentManager.test.tsx`:
  - Test submitting a Change Order with package items while left panel input builder fields are untouched/empty, verifying submission succeeds.
  - Test that "+ Tambah ke Change Order" in the builder continues to validate granular fields on click.
  - Test document-level validation errors (missing description or 0 items).
- Full verification: Vitest, Oxlint, `tsc --noEmit`, and `npm run build`.

### Explicitly Excluded
- Database schema alterations.
- Cashier or Mandor approval workflows.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Decouple form submission & remove HTML5 `required` on builder inputs in `AmendmentManager.tsx` | Antigravity | ✅ Completed | 0.5h |
| 2. Implement document-level final submission handler with explicit error feedback | Antigravity | ✅ Completed | 0.5h |
| 3. Add component tests covering decoupled submission and package submission without builder input | Antigravity | ✅ Completed | 0.5h |
| 4. Run full quality gate (Vitest, Oxlint, TypeScript compilation, Production Build) | Antigravity | ✅ Completed | 0.5h |

## Daily Log

### 2026-10-23
- Sprint 79 initialized.
- Analyzed false-positive required field validation bug on `/service-advisor` Change Orders tab:
  - Single `<form onSubmit={handleSubmit}>` wrapped both left builder panel and right review/submission panel.
  - Submit button had `type="submit"`, triggering native HTML5 tooltip validation on unneeded left panel inputs (`required` on `materialForm.unitPrice`, `targetQty`, etc.) when user added items via Assembly Packages.
- Implemented Task 1 & 2 in `src/components/AmendmentManager.tsx`:
  - Added `noValidate` to `<form>` container.
  - Removed HTML5 `required` attributes across all builder fields (material, labor, overhead) and description textarea.
  - Converted final submit button from `type="submit"` to `type="button"` with `onClick={handleSubmitFinalChangeOrder}`.
  - Made "+ Tambah ke Change Order" clickable (`disabled={submitting}`) to provide real-time validation error feedback when adding granular items.
  - Added explicit unit price validation (`unitPrice > 0`) in `handleAddOrUpdateItem`.
  - Added document-level validation in `handleSubmitFinalChangeOrder` (non-empty description, at least 1 draft item).
- Implemented Task 3 in `src/components/__tests__/AmendmentManager.test.tsx`:
  - Added 3 comprehensive test cases under `describe('Sprint 79...')`:
    1. Submitting Change Order with package items while left panel inputs are empty/unfilled succeeds without false required validation errors.
    2. Left-side granular item builder validates required fields on "+ Tambah ke Change Order".
    3. Final submission button still validates description and draft items presence.
- Passed full verification gate:
  - Automated tests: 58 test suites, 402 tests passing (100% green).
  - Linter: `oxlint` 0 warnings, 0 errors across 199 files.
  - TypeScript compiler: `tsc --noEmit` clean.
  - Production build: `npm run build` succeeds in 421ms.
