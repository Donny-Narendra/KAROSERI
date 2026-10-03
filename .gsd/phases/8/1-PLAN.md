---
phase: 8
plan: 1
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/20261003000006_phase8_schema.sql
  - src/types/database.ts
autonomous: true
must_haves:
  truths:
    - "Schema supports material requisitions and SPK-B"
    - "materials table has is_customer_supplied flag"
  artifacts:
    - "Migration file 20261003000006_phase8_schema.sql exists and is applied"
    - "database.ts is updated with new enums"
---

# Plan 8.1: Database Schema untuk Phase 8

<objective>
Membuat tabel dan kolom baru untuk mendukung fitur Material Requisition, Material Konsumen, dan SPK Borongan.
</objective>

<context>
Load for context:
- .gsd/phases/8/RESEARCH.md
- supabase/migrations/20261001000000_initial_schema.sql
</context>

<tasks>

<task type="auto">
  <name>Create Migration File</name>
  <files>supabase/migrations/20261003000006_phase8_schema.sql</files>
  <action>
    Create migration for Phase 8.
    1. Enum `requisition_status` ('PENDING', 'APPROVED', 'REJECTED').
    2. Add `is_customer_supplied BOOLEAN DEFAULT false` to `materials`.
    3. Create `material_requisitions` (id, spk_id, wbs_category, requested_by, status, notes).
    4. Create `material_requisition_items` (id, requisition_id, material_id, quantity).
    5. Create `spk_borongan` (id, spk_id, wbs_category, worker_name, contract_value, status, progress_percentage, created_by). Status values: 'ACTIVE', 'CUT_OFF', 'COMPLETED'.
    6. Add RLS for these tables. Mandor and Gudang need access. Mandor can create requisitions and SPK-B. Gudang can read and update requisitions. Owner can do all.
  </action>
  <verify>Migration file exists and has correct syntax.</verify>
  <done>File 20261003000006_phase8_schema.sql contains table definitions and RLS policies.</done>
</task>

<task type="auto">
  <name>Update TypeScript Definitions</name>
  <files>src/types/database.ts</files>
  <action>
    Update `src/types/database.ts` to export new enums:
    - `RequisitionStatus = 'PENDING' | 'APPROVED' | 'REJECTED'`
    - `SpkBoronganStatus = 'ACTIVE' | 'CUT_OFF' | 'COMPLETED'`
  </action>
  <verify>npm run build passes</verify>
  <done>database.ts exports the new types without breaking existing code.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] Migration applies successfully in Supabase.
- [ ] TypeScript types are updated.
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>
