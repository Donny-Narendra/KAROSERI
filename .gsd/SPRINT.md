# Sprint 2 — Refactor SPK Selection UI in Mandor Portal to Compact List

> **Duration**: 2026-10-15 to 2026-10-15
> **Status**: In Progress

## Goal
Refactor the SPK selection interface on the Mandor portal (`/mandor`) from a space-consuming 2-column card grid into a high-density, searchable vertical compact list inspired by the warehouse module SPK filter UI.

## Scope

### Included
- Layout & Container:
  - Convert active SPK selection from 2-column card grid into a compact single-column stack (`flex flex-col gap-2.5`).
  - Add height constraint with smooth scrollbar (`max-h-[500px] overflow-y-auto pr-1`).
  - Add real-time Search Box with placeholder `"Cari SPK, customer, plat, sub-task..."` with clear button.
- SPK Item Card Architecture (3-Row Compact Layout):
  - Row 1: Bold monospace SPK number (`font-mono font-bold`) and badge indicators (pending requisition count in amber e.g. `X Pending`, and QC status badge).
  - Row 2: Customer name (`font-semibold text-slate-100`) and contrast vehicle plate badge (`bg-blue-950/70 border-blue-800/60 text-blue-300 font-mono`).
  - Row 3: Sub-task scope summary (`Sub Task: [deskripsi]`) with subtle divider border and `text-[11px] text-slate-400 truncate`.
- Interactivity & Selection:
  - Subtle hover transitions (`hover:border-slate-700 hover:bg-slate-800/40`).
  - Selected state with amber border & background glow (`border-amber-500 bg-amber-500/10 shadow-sm`) and active indicator.
  - Seamless selection callback triggering WBS checklist & QC workflow.
- Data Enrichment:
  - Fetch pending requisitions count per SPK so the pending count badge displays accurate real-time values for mandor.
- Verification:
  - TypeScript build passes with 0 errors (`npm run build`).
  - Linter passes with 0 errors (`npm run lint`).

### Explicitly Excluded
- Database schema changes.
- Automatic git commits or pushes.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| Create dedicated Mandor compact SPK selector component (`SpkSelector.tsx`) matching warehouse filter UI aesthetics | Antigravity | ✅ Done | 1h |
| Enrich Mandor SPK fetching in `MandorDashboard.tsx` with pending requisitions count & integrate `SpkSelector` | Antigravity | ✅ Done | 0.5h |
| Verify responsive layout, search filtering, selection persistence, and WBS/QC trigger | Antigravity | ✅ Done | 0.5h |
| Run TypeScript build check (`npm run build`) and lint verification (`npm run lint`) | Antigravity | ✅ Done | 0.5h |

## Daily Log

### 2026-10-15
- Sprint created from user request.
- Archived Sprint 1 to `.gsd/sprints/sprint-1-fix-item-transfer-isolation.md`.
- Analyzed `MandorDashboard.tsx`, `SpkFilterListBox.tsx`, and requirements.
- Created `src/components/SpkSelector.tsx` featuring:
  - Single-column compact vertical list (`flex flex-col gap-2.5`) with max-height limit and scrollbar (`max-h-[500px] overflow-y-auto pr-1`).
  - Search box with instant filter across SPK number, customer name, vehicle plate, and sub-tasks, complete with clear (X) button and empty match state.
  - 3-row structured item card: Row 1 (Bold monospace SPK number, active checkmark badge, pending count badge & QC badge), Row 2 (customer name & dark contrast vehicle plate badge), Row 3 (sub-task summary with subtle top border).
  - Smooth hover states and amber highlighted active/selected state (`border-amber-500 bg-amber-500/10 shadow-sm ring-1 ring-amber-500`).
- Updated `src/types/spk.ts` to include optional `pending_requisitions_count`.
- Refactored `src/pages/MandorDashboard.tsx`:
  - Enriched data fetching using `Promise.all` across `spk` and `material_requisitions` with status `PENDING` to provide real-time requisition counts per SPK.
  - Replaced legacy 2-column card grid with `<SpkSelector />`.
  - Preserved active SPK selection and seamless triggering of `WbsChecklist` and `QcInspectionForm`.
- Validated with `npm run build` (`tsc -b && vite build`) and `oxlint`, achieving 0 errors and 0 warnings.
