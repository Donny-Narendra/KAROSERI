---
phase: 1
plan: 1
wave: 1
depends_on: []
files_modified: []
autonomous: true
user_setup:
  - service: supabase
    why: "Need to ensure migration 20261001000000_initial_schema.sql is executed and an initial Admin user exists."
must_haves:
  truths:
    - "RBAC roles are enforced on routes"
  artifacts:
    - "src/context/AuthContext.tsx"
    - "src/components/ProtectedRoute.tsx"
---

# Plan 1.1: Finalize Auth & RBAC Core

## Objective
Ensure Supabase authentication, AuthContext, and RBAC routing are fully operational. (Code largely exists from initialization; this plan ensures it's robust and correctly structured before proceeding).

## Context
- .gsd/SPEC.md
- src/context/AuthContext.tsx
- src/components/ProtectedRoute.tsx
- src/types/auth.ts

## Tasks

<task type="auto">
  <name>Verify AuthContext and ProtectedRoute Implementation</name>
  <files>src/components/ProtectedRoute.tsx</files>
  <action>
    Review and harden `ProtectedRoute` to ensure it strictly enforces the 5 roles (Owner/Admin, Service Advisor, Mandor, Gudang, Kasir). 
    Ensure unauthorized users are redirected to `/login`.
    Ensure users without the required roles are redirected appropriately.
  </action>
  <verify>npm run lint</verify>
  <done>Code handles role checks robustly and type safely.</done>
</task>

## Success Criteria
- [ ] RBAC is strictly enforced across application routes.
