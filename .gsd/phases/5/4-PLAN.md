---
phase: 5
plan: 4
wave: 4
---

# Plan 5.4: Payment & Handover Release (Gate 4)

## Objective
Enforce Gate 4 (Handover Gate) allowing the Kasir to release the vehicle and print the BAST only after the invoice is fully paid ("LUNAS").

## Context
- .gsd/SPEC.md
- src/pages/KasirDashboard.tsx

## Tasks

<task type="auto">
  <name>Implement Payment Status Toggles</name>
  <files>src/pages/KasirDashboard.tsx</files>
  <action>
    - Add functionality to update the invoice status from `UNPAID` to `LUNAS`.
    - This can be a button "Mark as Paid" in the Kasir UI for generated bills.
  </action>
  <verify>cat src/pages/KasirDashboard.tsx</verify>
  <done>UI provides a way to mark invoices as paid.</done>
</task>

<task type="auto">
  <name>Implement Gate 4 (BAST Handover)</name>
  <files>src/pages/KasirDashboard.tsx</files>
  <action>
    - Add a "Release Vehicle & Print BAST" button.
    - Disable this button completely unless the invoice status is `LUNAS` (Gate 4 Enforcement).
    - Provide a visual cue (Lock icon) when disabled.
  </action>
  <verify>npm run build</verify>
  <done>App builds with Gate 4 logic accurately implemented.</done>
</task>

## Success Criteria
- [ ] Handover button is locked when status is not LUNAS.
- [ ] App builds with zero TypeScript errors.
