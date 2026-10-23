# Sprint 79 — Fix False Required Field Validation on Change Order Submission

> **Duration**: 2026-10-23 to 2026-10-24
> **Status**: In Progress

## Goal
Decouple granular item builder form validation in the left panel from the final Change Order submission action in the right panel, preventing false-positive HTML5 validation errors (such as browser tooltip "Please enter a number" on unused left panel inputs) when submitting package-based or manually reviewed Change Orders.

## Scope

### Included
- `src/components/AmendmentManager.tsx`:
  - Add `noValidate` to `<form>` container to prevent native browser tooltips from blocking submission on hidden/inactive inputs.
  - Change "Ajukan Change Order" button from `type="submit"` to `type="button"` with `onClick={handleSubmitFinalChangeOrder}` (or explicit handler).
  - Remove HTML5 `required` attributes from left panel builder inputs:
    - Material inputs (`material-target-qty`, `unitPrice`, etc.)
    - Labor inputs (`labor-target-qty`, `unitPrice`, etc.)
    - Overhead inputs (`overhead-description-input`, `overhead-target-qty`, `unitPrice`, etc.)
    - `LaborSearchAutocomplete.tsx` input if `required` is present or conditionally passed.
  - Maintain and enhance validation on `handleAddOrUpdateItem` for the left builder: ensure valid name, quantity > 0, price, and matching WBS distribution.
  - Final Change Order submission validates document-level integrity:
    - Description & Justification must be non-empty.
    - Minimal 1 draft item in right review table (`draftItems.length > 0`).
    - Validates each draft item for non-empty name and positive quantity.
- `src/components/__tests__/AmendmentManager.test.tsx`:
  - Test submitting a Change Order with package items while left panel input builder fields are untouched/empty, verifying submission succeeds.
  - Test that "+ Tambah ke Change Order" in the builder continues to validate granular fields.
  - Test document-level validation errors (missing description or 0 items).
- Full verification: Vitest, Oxlint, `tsc --noEmit`, and `npm run build`.

### Explicitly Excluded
- Database schema alterations.
- Cashier or Mandor approval workflows.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Decouple form submission & remove HTML5 `required` on builder inputs in `AmendmentManager.tsx` | Antigravity | ⬜ Todo | 0.5h |
| 2. Implement document-level final submission handler with explicit error feedback | Antigravity | ⬜ Todo | 0.5h |
| 3. Add component tests covering decoupled submission and package submission without builder input | Antigravity | ⬜ Todo | 0.5h |
| 4. Run full quality gate (Vitest, Oxlint, TypeScript compilation, Production Build) | Antigravity | ⬜ Todo | 0.5h |

## Daily Log

### 2026-10-23
- Sprint 79 initialized.
- Analyzed false-positive required field validation bug on `/service-advisor` Change Orders tab:
  - Single `<form onSubmit={handleSubmit}>` wrapped both left builder panel and right review/submission panel.
  - Submit button had `type="submit"`, triggering native HTML5 tooltip validation on unneeded left panel inputs (`required` on `materialForm.unitPrice`, `targetQty`, etc.) when user added items via Assembly Packages.
