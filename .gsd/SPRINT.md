# Sprint 55 — Fix Cropped Layout and Print Optimization for Down Payment Invoice Receipt Modal

> **Duration**: 2026-10-20 to 2026-10-21
> **Status**: In Progress

## Goal
Fix the viewport cropping and print layout in `DpReceiptPrintModal.tsx` by implementing a responsive `max-h-[90vh]` dialog container with smooth vertical scrolling, compacting the white receipt sheet padding and signature heights (`h-14`), and refining the `@media print` CSS so the official DP invoice receipt is fully visible on screen and prints perfectly on a single A4 page.

## Scope

### Included
- **Modal Dialog Responsiveness (`src/components/finance/DpReceiptPrintModal.tsx`)**:
  - Dialog overlay padding: `p-3 md:p-6 flex items-center justify-center`.
  - Dialog card container: `w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden`.
  - Sticky header toolbar with title and action buttons.
  - Scrollable container: `flex-1 overflow-y-auto p-4 md:p-6 flex justify-center`.
- **Receipt Sheet Compact Spacing**:
  - Table cell padding adjusted to `py-1.5 px-2.5`.
  - Compact Terms & Conditions box with `text-[10px]`, `leading-tight`, and `my-2.5 p-2`.
  - Signature column height set to `h-14` (clean signature spacing without oversized vertical footprint).
  - Maintained all metadata, Kop RobelKaroseri, receipt number, Rupiah formatting, and Terbilang.
- **Refined `@media print` CSS**:
  - Isolate `#dp-receipt-print-area` and `[data-id="printable-dp-receipt"]` with `visibility: visible` and absolute position.
  - Page break avoidance (`break-inside: avoid !important`).
  - Single page A4 portrait printing without blank trailing pages.
- **Verification & Automated Tests**:
  - Run Vitest component tests (`DpReceiptPrintModal.test.tsx`, `DownPaymentModal.test.tsx`, `DpHistoryList.test.tsx`).
  - Run Oxlint linter and Vite production build.

### Explicitly Excluded
- Changing backend payment recording or SPK status update logic.
- Modifying final bill invoice export template (`invoiceExport.ts`).

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Refactor dialog container and compact printable sheet layout in `DpReceiptPrintModal.tsx` | Antigravity | ⏳ In Progress | 0.4h |
| 2. Optimize `@media print` CSS rules for single-page A4 print | Antigravity | ⬜ Todo | 0.2h |
| 3. Verify automated tests, linter, and production build | Antigravity | ⬜ Todo | 0.2h |

## Daily Log

### 2026-10-20
- Initialized Sprint 55: Fix Cropped Layout and Print Optimization for Down Payment Invoice Receipt Modal.
- Updated `.gsd/STATE.md` to reflect active Sprint 55.
