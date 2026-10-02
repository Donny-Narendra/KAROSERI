---
phase: 4
plan: 3
wave: 2
depends_on: [1, 2]
files_modified:
  - src/pages/KasirDashboard.tsx
autonomous: true
must_haves:
  truths:
    - "Final bill calculations use actual material costs from inventory_transactions and actual labor costs."
    - "Billing generation creates a record in invoices table."
    - "Marking as Paid updates invoice status to LUNAS and SPK status to DELIVERED."
  artifacts:
    - "Integration with invoices table in KasirDashboard."
---

# Plan 4.3: Final Billing Integration & Gate 3 Enforcement

<objective>
Connect the Kasir Dashboard to actual database records for calculating the final bill and generating invoices. Enforce Gate 3 by only allowing billing for SPKs that have passed Quality Control.

Purpose: Automate correct financial billing based on real usage rather than estimates.
Output: Kasir Dashboard with full Supabase integration.
</objective>

<context>
Load for context:
- src/pages/KasirDashboard.tsx
- supabase/migrations/20261001000005_phase5_schema.sql
</context>

<tasks>

<task type="auto">
  <name>Aggregate Actual Costs</name>
  <files>src/pages/KasirDashboard.tsx</files>
  <action>
    Update `fetchSpks` or add a new fetch function to aggregate actual costs.
    Query `inventory_transactions` joined with `materials` to sum up the actual material costs for the SPK.
    Query `rab_items` where `type='jasa'` to sum up actual labor costs.
    Replace the hardcoded `15000000` jasa cost and estimated material cost with these actual values.
    AVOID: Using the `total_estimated_cost` from SPK table for final billing.
  </action>
  <verify>Check the UI to ensure costs reflect actual data from DB, not hardcoded/estimated values.</verify>
  <done>Cost Breakdown shows actual aggregated values.</done>
</task>

<task type="auto">
  <name>Gate 3 and Invoicing Integration</name>
  <files>src/pages/KasirDashboard.tsx</files>
  <action>
    Fetch the latest `qc_inspections` status for the SPK and use it to set `qcStatus`. This enforces Gate 3 (locking final bill if not PASS).
    Implement the "Generate Final Bill (Invoice)" button to insert a record into the `invoices` table with `status = 'UNPAID'`.
    Implement the "Mark as Paid" button to update the `invoices` table to `LUNAS` and update the `spk` status to `DELIVERED` (or equivalent final state).
  </action>
  <verify>Ensure invoices are created in DB and marking as paid updates both invoice and SPK.</verify>
  <done>Invoicing and payment flow is fully integrated with Supabase.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] Actual costs are aggregated and displayed.
- [ ] Invoices table is populated upon bill generation.
- [ ] SPK is completed (DELIVERED) when paid.
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>
