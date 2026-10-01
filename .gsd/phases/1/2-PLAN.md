---
phase: 1
plan: 2
wave: 1
depends_on: []
files_modified: []
autonomous: true
must_haves:
  truths:
    - "Owner dashboard renders cleanly"
  artifacts:
    - "src/pages/AdminDashboardPage.tsx"
---

# Plan 1.2: Finalize Owner Dashboard Mock Data

## Objective
Finalize the Owner Executive Dashboard. Since SPK data (Phase 2) and Material (Phase 4) are not yet available, ensure the dashboard handles its current dummy state gracefully.

## Context
- src/pages/AdminDashboardPage.tsx

## Tasks

<task type="auto">
  <name>Refactor Admin Dashboard Data Structure</name>
  <files>src/pages/AdminDashboardPage.tsx</files>
  <action>
    Extract the inline dummy SPK data from the JSX table into a defined constant array (`const MOCK_SPKS = [...]`).
    This prepares the component for an easy swap to real Supabase data fetching once Phase 2 and 3 are complete.
  </action>
  <verify>npm run lint</verify>
  <done>Dashboard JSX is clean and iterates over a mock data array.</done>
</task>

## Success Criteria
- [ ] AdminDashboardPage code is strictly formatted and prepared for future API integration.
