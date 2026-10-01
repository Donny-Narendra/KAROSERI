---
phase: 3
plan: 1
wave: 1
---

# Plan 3.1: WBS & RAB Database Schema

## Objective
Create the foundational database schema for the Work Breakdown Structure (WBS) and Rencana Anggaran Biaya (RAB) Estimator in Supabase, establishing the tables necessary to track material and labor costs against SPKs.

## Context
- .gsd/SPEC.md
- .gsd/phases/3/RESEARCH.md
- supabase/migrations/20261001000001_spk_schema.sql

## Tasks

<task type="auto">
  <name>Create WBS and Material Tables</name>
  <files>supabase/migrations/20261001000003_wbs_schema.sql</files>
  <action>
    Create a new Supabase migration file `20261001000003_wbs_schema.sql`.
    Add `wbs_category` ENUM ('Pembongkaran', 'Sasis/Rangka', 'Dinding/Fabrikasi', 'Cat/Finishing', 'Kelistrikan/Hidrolik').
    Create `materials` table (id, name, unit_price, waste_factor_percentage).
    Create `rab_estimations` table (id, spk_id, total_material_cost, total_labor_cost, total_estimated_cost).
    Create `rab_items` table (id, rab_estimation_id, wbs_category, material_id, quantity, labor_hours, labor_rate, item_total).
    Add appropriate RLS policies for Service Advisor and Owner.
  </action>
  <verify>grep "CREATE TABLE" supabase/migrations/20261001000003_wbs_schema.sql</verify>
  <done>SQL migration script is correctly created with all required tables and RLS policies.</done>
</task>

## Success Criteria
- [ ] `20261001000003_wbs_schema.sql` is present and contains valid PostgreSQL DDL.
- [ ] Tables `materials`, `rab_estimations`, and `rab_items` exist in the migration.
- [ ] Migration includes RLS policies.
