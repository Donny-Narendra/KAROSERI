---
phase: 4
plan: 1
wave: 1
---

# Plan 4.1: Database Schema for Goods Issue & Mandor Checklists

## Objective
Create the database tables and Row Level Security (RLS) policies for recording inventory transactions (Goods Issue) and tracking WBS task progress (Mandor checklists).

## Context
- .gsd/SPEC.md
- .gsd/ROADMAP.md
- supabase/migrations/20261001000003_wbs_schema.sql

## Tasks

<task type="auto">
  <name>Create Inventory & Checklist Schema</name>
  <files>supabase/migrations/20261001000004_phase4_schema.sql</files>
  <action>
    - Create a new migration file.
    - Create `inventory_transactions` table to track material usage per SPK (`spk_id`, `material_id`, `quantity_issued`, `issued_by`, `issued_at`).
    - Create `wbs_checklists` table to track QC and progress per SPK and WBS Category (`spk_id`, `wbs_category`, `status`, `notes`, `updated_by`).
    - Enable RLS on both tables.
    - Create RLS policies: Petugas Gudang can insert/read `inventory_transactions`. Mandor can insert/read/update `wbs_checklists`. Owner can do everything.
  </action>
  <verify>Get-Content supabase/migrations/20261001000004_phase4_schema.sql</verify>
  <done>Migration file is created with the required tables and RLS policies.</done>
</task>

## Success Criteria
- [ ] `inventory_transactions` table defined.
- [ ] `wbs_checklists` table defined.
- [ ] RLS policies restrict access to Gudang, Mandor, and Owner accordingly.
