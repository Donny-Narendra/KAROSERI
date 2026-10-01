---
phase: 2
plan: 3
wave: 3
gap_closure: true
---

# Plan 2.3: Change Order (Amendment) Management UI

## Objective
Address the gap identified in Phase 2 verification: build the UI for managing Change Orders (Amendments) so the Service Advisor can request amendments and Owners can approve/reject them.

## Context
- .gsd/SPEC.md
- src/pages/ServiceAdvisorDashboard.tsx
- src/pages/AdminDashboardPage.tsx

## Tasks

<task type="auto">
  <name>Build Change Order Component</name>
  <files>
    src/components/AmendmentManager.tsx
    src/pages/ServiceAdvisorDashboard.tsx
  </files>
  <action>
    - Create `AmendmentManager.tsx` to list amendments for a given SPK and allow Service Advisors to submit new amendments.
    - Owners should see an approve/reject action for pending amendments.
    - Integrate `AmendmentManager` into `ServiceAdvisorDashboard` or a dedicated SPK Details view.
  </action>
  <verify>npm run build</verify>
</task>

## Success Criteria
- [ ] Amendments can be created by Service Advisors.
- [ ] Amendments can be approved/rejected by Owners.
