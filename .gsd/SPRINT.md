# Sprint 58 — Fix DP Receipt White Sheet Overflow and Background Clipping on Scroll

> **Duration**: 2026-10-20 to 2026-10-20
> **Status**: In Progress

## Goal
Ensure the white sheet container in `DpReceiptPrintModal.tsx` uses `min-h-[297mm] h-auto` with `bg-white text-slate-900` fully wrapping all receipt content (from header to signature footer) without overflow, provide clean scrolling with padding inside `overflow-y-auto`, and maintain clean single-page A4 printability.

## Scope

### Included
- Refactor wrapper & sheet styling in `src/components/finance/DpReceiptPrintModal.tsx`.
- Ensure `#printable-dp-receipt` has `min-h-[297mm] h-auto` with `bg-white text-slate-900` and flex column layout wrapping all content including Terms & Conditions and Signature footer.
- Ensure the scroll container (`overflow-y-auto`) has padding (`p-4 md:p-6 bg-slate-950 flex justify-center`) so the white receipt sheet floats cleanly over the dark modal background.
- Refactor footer signatures to use professional clean signature columns with `mt-auto`, Kasir, and Konsumen labels.
- Verify print styles (`@media print`) maintain single A4 page without spilling or second blank page.
- Update unit tests in `src/components/finance/__tests__/DpReceiptPrintModal.test.tsx`.
- Verify full test suite (Vitest), Oxlint, and production build (`npm run build`).

### Explicitly Excluded
- Modifying SPK or billing business logic.
- Unrelated invoices (e.g. pelunasan / BAST).

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| Refactor wrapper and sheet styling in DpReceiptPrintModal.tsx | Claude | 🔄 In Progress | 0.5 |
| Update and expand unit tests in DpReceiptPrintModal.test.tsx | Claude | ⬜ Todo | 0.5 |
| Run Oxlint, Vitest test suite, and production build verification | Claude | ⬜ Todo | 0.5 |

## Daily Log

### 2026-10-20
- Sprint created.

## Risks & Blockers

| Risk | Impact | Mitigation |
|------|--------|------------|
| Print view multi-page spillover if min-height is enforced during print | Med | Override min-height to auto and zero margins in @media print rules |

---

*Last updated: 2026-10-20*
