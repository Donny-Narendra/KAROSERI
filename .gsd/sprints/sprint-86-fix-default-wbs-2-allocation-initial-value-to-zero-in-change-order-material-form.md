# Sprint 86 — Fix Default WBS 2 Allocation Initial Value to Zero in Change Order Material Form

> **Duration**: 2026-10-24 to 2026-10-24
> **Status**: In Progress

## Goal
Initialize the default WBS 2 allocation state and reset state to '0' (instead of '1') in the Change Order material builder form (`AmendmentManager.tsx` / `ItemizedChangeOrderForm.tsx`), ensuring all WBS stages (WBS 1 to 5) default to 0 and render an initial warning badge `Sisa: 1.00` until the user consciously assigns quantities to work breakdown stages.

## Scope

### Included
- Define reusable `DEFAULT_WBS_ALLOCATIONS` constant in `AmendmentManager.tsx` with all 5 stages mapped to `'0'`.
- Update `wbsAllocations` useState initial state to use `DEFAULT_WBS_ALLOCATIONS`.
- Update `resetBuilderInputs` to reset `wbsAllocations` to `DEFAULT_WBS_ALLOCATIONS`.
- Verify `isAllocationMatch` and status badge rendering displays `Sisa: 1.00` upon opening form with `targetQty = 1` and all WBS stages set to 0.
- Update existing tests in `AmendmentManager.test.tsx` that previously expected initial WBS 2 to be 1.
- Add unit tests verifying initial WBS allocations are 0, status badge is `Sisa: 1.00`, allocation to 1 updates status to `Sesuai / Pas (0.00)`, and reset reverts WBS allocations back to 0.
- Run test suite, oxlint, and production build.

### Explicitly Excluded
- Modifying WBS allocation logic for Product Package assemblies modal (`ChangeOrderPackageModal.tsx` which already uses empty string inputs).
- Changing database schema or backend services.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| Task 1: Update initial state and reset logic in `AmendmentManager.tsx` | Claude | ✅ Done | 0.5 |
| Task 2: Update existing and add new automated tests in `AmendmentManager.test.tsx` | Claude | ✅ Done | 0.5 |
| Task 3: Quality validation (tests, linter, production build) | Claude | ✅ Done | 0.5 |

## Daily Log

### 2026-10-24
- Sprint created. Identified root causes in `src/components/AmendmentManager.tsx` at lines 165 and 252 where `'WBS 2: Sasis/Rangka': '1'` was hardcoded.
- Task 1: Defined exported `DEFAULT_WBS_ALLOCATIONS` constant with all 5 WBS stages mapped to `'0'`, updated `wbsAllocations` useState initial value and `resetBuilderInputs` logic. Also exported `DEFAULT_WBS_ALLOCATIONS` from `ItemizedChangeOrderForm.tsx` and `ChangeOrdersTab.tsx`.
- Task 2: Updated existing tests in `AmendmentManager.test.tsx` that previously relied on automatic WBS 2 = 1 allocation. Added 3 new unit tests verifying default 0 allocation, initial warning badge `Sisa: 1.00`, correct transition to `Sesuai / Pas (0.00)` on user allocation, and proper reset to 0 upon adding items or switching modes.
- Task 3: Ran all 61 automated test suites (452 tests passed, 100% green). Verified 0 errors with `npx oxlint`. Successfully built production bundle via `npm run build`.
