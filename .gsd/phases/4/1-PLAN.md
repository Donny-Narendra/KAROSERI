---
phase: 4
plan: 1
wave: 1
depends_on: []
files_modified:
  - src/pages/KasirDashboard.tsx
autonomous: true
must_haves:
  truths:
    - "Kasir can record DP amount for an SPK."
    - "Recording DP sets SPK status to ACTIVE and saves the dp_amount."
  artifacts:
    - "UI for DP input in KasirDashboard."
---

# Plan 4.1: Down Payment (DP) Recording & SPK Activation

<objective>
Implement the capability for the Kasir (Cashier) to record the initial Down Payment (DP) for an SPK, which formally activates the SPK (changing status from DRAFT/PENDING_PAYMENT to ACTIVE) to allow production (WBS) to begin.

Purpose: Enforces the business rule that WBS cannot start without DP.
Output: DP recording feature in KasirDashboard.
</objective>

<context>
Load for context:
- .gsd/GAP_ANALYSIS_DASHBOARD_ROLES.md
- src/pages/KasirDashboard.tsx
</context>

<tasks>

<task type="auto">
  <name>Implement DP Recording UI and Logic</name>
  <files>src/pages/KasirDashboard.tsx</files>
  <action>
    Update `KasirDashboard` to allow recording of DP for SPKs that are in `PENDING_PAYMENT` or `DRAFT` status.
    Add an input field for the DP amount and a submit button.
    When submitted, call Supabase to update the `spk` table: set `dp_amount` to the entered value and `status` to `ACTIVE`.
    Refresh the SPK list to reflect the changes.
    AVOID: Changing the invoice table yet, just update the SPK table.
  </action>
  <verify>Check KasirDashboard UI, ensure DP input exists and updates SPK status in Supabase.</verify>
  <done>DP amount is saved in `spk` table and status changes to `ACTIVE`.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] Kasir can record DP for an SPK.
- [ ] SPK status changes to ACTIVE upon DP recording.
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>
