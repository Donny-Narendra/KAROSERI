---
phase: 4
plan: 3
wave: 2
---

# Plan 4.3: Mandor Tablet Interface

## Objective
Build a specialized, industrial tablet-friendly UI for the "Mandor" to update WBS progress and fill out checklists.

## Context
- .gsd/SPEC.md
- src/App.tsx

## Tasks

<task type="auto">
  <name>Create Mandor Tablet Dashboard</name>
  <files>
    - src/pages/MandorDashboard.tsx
    - src/components/WbsChecklist.tsx
    - src/App.tsx
  </files>
  <action>
    - Build `MandorDashboard.tsx` with a large, touch-friendly UI suitable for tablets.
    - Build `WbsChecklist.tsx` for updating progress of WBS stages (1-5). Use large buttons, high contrast, and clear state indicators.
    - Include functionality to mark stages as "PASS" or "FAIL" (precursor to Gate 3).
    - Add the route to `App.tsx` wrapped in `<ProtectedRoute allowedRoles={['owner', 'mandor']}>`.
  </action>
  <verify>npm run build</verify>
  <done>Mandor dashboard builds successfully with a tablet-friendly UI.</done>
</task>

## Success Criteria
- [ ] MandorDashboard is accessible to Mandor role.
- [ ] UI is optimized for touch/tablet usage (large touch targets).
- [ ] Allows updating WBS checklist states.
