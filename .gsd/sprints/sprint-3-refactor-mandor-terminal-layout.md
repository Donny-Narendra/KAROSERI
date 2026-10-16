# Sprint 3 — Refactor Mandor Terminal Layout to Side-by-Side Master-Detail View

> **Duration**: 2026-10-15 to 2026-10-15
> **Status**: Completed

## Goal
Refactor the Mandor Terminal (`/mandor`) from a vertical stacked layout into a high-efficiency responsive side-by-side master-detail view where the SPK selector (master) sits on the left column with independent scroll, and the WBS Progress & QC forms (detail) sit on the right column.

## Scope

### Included
- Layout & Container Architecture:
  - Transformed `MandorDashboard.tsx` from single-column vertical stack into a 12-column responsive grid container:
    - Master (Left Column): `lg:col-span-4 xl:col-span-4 space-y-4 lg:sticky lg:top-24` containing `<SpkSelector />`.
    - Detail (Right Column): `lg:col-span-8 xl:col-span-8 space-y-6` containing `<WbsChecklist />` and `<QcInspectionForm />`.
  - Widened container width from restrictive `max-w-4xl` to standard wide container (`container mx-auto px-4 sm:px-6 lg:px-8 py-6`) to provide comfortable room for master-detail split.
- Height & Scroll Behavior:
  - Enhanced `SpkSelector.tsx` list container with independent scroll constraint (`max-h-[420px] lg:max-h-[calc(100vh-220px)] overflow-y-auto pr-1`) and `shrink-0` header/search sections so users can scroll through active SPKs without shifting the entire page.
  - Sticky sidebar on desktop (`lg:sticky lg:top-24`) keeps SPK list in view during deep scrolling in detail checklist.
- Empty State & Reactivity:
  - Detail column displays a clear, informative empty state placeholder with icon when no SPK is selected.
  - Immediate reactivity: selecting any SPK instantly updates WBS cards, material requisition actions, and QC form.
- Responsiveness:
  - Mobile & tablet screens (`< lg`) fall back cleanly to a vertical stacked 1-column layout (`grid-cols-1`).
- Quality & Verification:
  - Build validation (`npm run build`): 0 errors.
  - Linting validation (`npm run lint`): 0 errors.

### Explicitly Excluded
- Database schema changes.
- Altering authorization rules or backend queries.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| Update `SpkSelector.tsx` scroll/height constraints for master-detail view | Antigravity | ✅ Done | 0.5h |
| Refactor `MandorDashboard.tsx` to 12-column responsive master-detail grid with sticky sidebar & empty state | Antigravity | ✅ Done | 0.5h |
| Verify responsive behavior across desktop & mobile breakpoints | Antigravity | ✅ Done | 0.5h |
| Validate with TypeScript build check (`npm run build`) and lint (`npm run lint`) | Antigravity | ✅ Done | 0.5h |

## Daily Log

### 2026-10-15
- Sprint 3 created from user request.
- Archived Sprint 2 to `.gsd/sprints/sprint-2-refactor-mandor-spk-selection-ui.md`.
- Analyzed `MandorDashboard.tsx` and `SpkSelector.tsx`.
- Updated `src/components/SpkSelector.tsx`:
  - Added `maxHeightClassName` and `className` props with default `max-h-[420px] lg:max-h-[calc(100vh-220px)]`.
  - Added `shrink-0` on header and search container to prevent squishing inside flex column.
  - Refactored Row 2 customer name to `flex-1 min-w-0 truncate` for clean alignment beside plate badge inside the 4-column master panel.
- Refactored `src/pages/MandorDashboard.tsx`:
  - Implemented 12-column responsive grid (`grid-cols-1 lg:grid-cols-12 gap-6 items-start`).
  - Placed `SpkSelector` in `lg:col-span-4 xl:col-span-4 space-y-4 lg:sticky lg:top-24`.
  - Placed detail section in `lg:col-span-8 xl:col-span-8 space-y-6`.
  - Added empty state card in detail column when no SPK is selected.
- Validated build (`npm run build`) and linter (`npm run lint`), achieving 0 errors.
