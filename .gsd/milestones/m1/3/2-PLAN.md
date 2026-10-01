---
phase: 3
plan: 2
wave: 2
---

# Plan 3.2: RAB Calculator UI

## Objective
Build the RAB (Rencana Anggaran Biaya) Calculator UI for the Service Advisor, allowing them to select WBS items, estimate material and labor, and auto-calculate costs.

## Context
- .gsd/SPEC.md
- .gsd/phases/3/RESEARCH.md
- src/pages/ServiceAdvisorDashboard.tsx

## Tasks

<task type="auto">
  <name>Build RabCalculator Component</name>
  <files>src/components/RabCalculator.tsx</files>
  <action>
    Create a new React component `RabCalculator.tsx` inside `src/components`.
    Implement a form to add `rab_items` tied to a specific WBS category.
    The component should calculate: `Total = (Material Qty * Price * (1 + Waste Factor)) + (Labor Hours * Rate)`.
    Display a running total of the estimated cost.
    Use dummy data for materials initially if backend integration is complex, but prepare the UI for Supabase integration.
  </action>
  <verify>grep "RabCalculator" src/components/RabCalculator.tsx</verify>
  <done>RabCalculator component renders properly with calculation logic.</done>
</task>

<task type="auto">
  <name>Integrate RabCalculator to Dashboard</name>
  <files>src/pages/ServiceAdvisorDashboard.tsx</files>
  <action>
    Import and render `RabCalculator` within the `ServiceAdvisorDashboard.tsx` or as a new sub-page.
    Ensure the user can navigate to the RAB Calculator when an SPK is active.
  </action>
  <verify>grep "RabCalculator" src/pages/ServiceAdvisorDashboard.tsx</verify>
  <done>RabCalculator is accessible from the Service Advisor dashboard.</done>
</task>

## Success Criteria
- [ ] `RabCalculator.tsx` component is built and calculates totals correctly.
- [ ] `ServiceAdvisorDashboard.tsx` integrates the calculator.
- [ ] The build passes without TypeScript/linting errors.
