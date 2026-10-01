---
phase: 5
plan: 1
wave: 1
---

# Plan 5.1: Database Schema for QC & Billing

## Objective
Create the database tables to support the dynamic QC Inspection forms (JSONB) and financial tracking (Invoices/Billing).

## Context
- .gsd/SPEC.md
- .gsd/ROADMAP.md
- supabase/migrations/

## Tasks

<task type="auto">
  <name>Create QC & Invoice Schema</name>
  <files>supabase/migrations/20261001000005_phase5_schema.sql</files>
  <action>
    - Create a new migration file.
    - Create `qc_inspections` table: `id`, `spk_id` (uuid), `form_data` (JSONB), `status` (PENDING, PASS, FAIL), `inspected_by` (uuid), `inspected_at` (timestamp).
    - Create `invoices` table: `id`, `spk_id` (uuid), `dp_amount` (numeric), `actual_material_cost` (numeric), `actual_labor_cost` (numeric), `total_amount` (numeric), `status` (DRAFT, UNPAID, LUNAS), `created_at`, `updated_at`.
    - Enable RLS on both tables.
    - RLS `qc_inspections`: Mandor and Owner have full access. Kasir has SELECT access.
    - RLS `invoices`: Kasir and Owner have full access.
  </action>
  <verify>Get-Content supabase/migrations/20261001000005_phase5_schema.sql</verify>
  <done>Migration file successfully defines `qc_inspections` and `invoices` tables with correct RLS policies.</done>
</task>

## Success Criteria
- [ ] `qc_inspections` table has a `form_data` JSONB column.
- [ ] `invoices` table has payment tracking columns and status enum.
- [ ] RLS policies restrict table access properly.
