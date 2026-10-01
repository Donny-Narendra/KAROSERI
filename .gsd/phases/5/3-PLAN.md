---
phase: 5
plan: 3
wave: 3
---

# Plan 5.3: Kasir Dashboard & Billing Calculator (Gate 3)

## Objective
Implement the Kasir dashboard to calculate Actual Costing and enforce Gate 3 (QC Billing Gate) preventing final billing if QC is not PASS.

## Context
- .gsd/SPEC.md
- src/App.tsx

## Tasks

<task type="auto">
  <name>Create Kasir Dashboard UI</name>
  <files>src/pages/KasirDashboard.tsx</files>
  <action>
    - Create `KasirDashboard.tsx` for the `kasir` role.
    - Fetch/Mock SPKs and their respective `qc_inspections` status.
    - Build a "Billing Calculator" section that implements the formula: `Total = (Material + Jasa) - DP`.
  </action>
  <verify>cat src/pages/KasirDashboard.tsx</verify>
  <done>KasirDashboard renders billing calculator.</done>
</task>

<task type="auto">
  <name>Implement Gate 3 Logic</name>
  <files>src/pages/KasirDashboard.tsx, src/App.tsx</files>
  <action>
    - In `KasirDashboard.tsx`, disable the "Generate Final Bill" button if the SPK's QC status is not `PASS` (Gate 3).
    - Show an alert/warning indicating that QC is pending or failed.
    - Update `src/App.tsx` routing to add the `/kasir` route for the `kasir` and `owner` roles, and update `RootRedirect` to point `kasir` users to `/kasir`.
  </action>
  <verify>npm run build</verify>
  <done>App builds successfully and routing is configured.</done>
</task>

## Success Criteria
- [ ] Kasir Dashboard blocks billing if QC status is not PASS.
- [ ] Formula for actual costing is correctly represented in the UI.
