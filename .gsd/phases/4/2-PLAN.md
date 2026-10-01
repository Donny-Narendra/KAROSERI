---
phase: 4
plan: 2
wave: 2
---

# Plan 4.2: Warehouse Interface & Material Budget Gate

## Objective
Implement the "Petugas Gudang" dashboard to issue materials, enforcing Gate 2 (Material Budget Gate) which blocks issuing quantities exceeding RAB estimates + waste factor unless authorized.

## Context
- .gsd/SPEC.md
- src/App.tsx
- src/pages/AdminDashboardPage.tsx (for layout reference)

## Tasks

<task type="auto">
  <name>Create Warehouse Dashboard with Gate 2 Validation</name>
  <files>
    - src/pages/WarehouseDashboard.tsx
    - src/components/GoodsIssueForm.tsx
    - src/App.tsx
  </files>
  <action>
    - Build `WarehouseDashboard.tsx` for the "Petugas Gudang" role.
    - Build `GoodsIssueForm.tsx` which allows issuing materials for an SPK.
    - Implement Gate 2 Logic: Calculate if the requested quantity exceeds the remaining allowable budget (RAB qty * (1 + waste factor / 100) - already issued qty). If it exceeds, disable submission and show a clear "Gate 2 Locked: Overbudget" warning.
    - Add the route to `App.tsx` wrapped in `<ProtectedRoute allowedRoles={['owner', 'petugas_gudang']}>`.
  </action>
  <verify>npm run build</verify>
  <done>Warehouse dashboard builds successfully and enforces the Gate 2 logic in the UI.</done>
</task>

## Success Criteria
- [ ] WarehouseDashboard is accessible to Gudang role.
- [ ] Goods Issue form calculates allowable budget and blocks overbudget requests (Gate 2).
