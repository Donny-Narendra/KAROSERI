---
phase: 4
plan: 2
wave: 1
depends_on: []
files_modified:
  - src/components/QcInspectionForm.tsx
autonomous: true
must_haves:
  truths:
    - "Mandor can submit QC Inspection with Uji Kelistrikan parameter."
    - "QC Inspection results are saved to Supabase qc_inspections table."
  artifacts:
    - "QcInspectionForm UI includes Uji Kelistrikan."
---

# Plan 4.2: Full QC Inspection Backend Integration

<objective>
Fully integrate the `QcInspectionForm` with Supabase so that Mandor can perform Quality Control (QC) checks, including the missing Uji Kelistrikan (Electrical Test). This serves as the Gate 3 enforcement for Handover.

Purpose: Move QC from mock state to actual database records for Gate 3 enforcement.
Output: Working QC Inspection Form.
</objective>

<context>
Load for context:
- .gsd/GAP_ANALYSIS_DASHBOARD_ROLES.md
- src/components/QcInspectionForm.tsx
- supabase/migrations/20261001000005_phase5_schema.sql
</context>

<tasks>

<task type="auto">
  <name>Integrate QC Form to Supabase</name>
  <files>src/components/QcInspectionForm.tsx</files>
  <action>
    Add `uji_kelistrikan` to the state and UI checkboxes.
    Update the `handleSubmit` function to insert/upsert the QC results into the `qc_inspections` table in Supabase.
    `form_data` should store the boolean values of all 4 checks.
    `status` should be 'PASS' if all checks are true, else 'FAIL'.
    Update the SPK status in the `spk` table to 'READY_FOR_HANDOVER' if the QC passes.
    AVOID: Keeping the `console.log("Submitting QC Inspection (Mock):", payload)` mock logic.
  </action>
  <verify>Submit the form and check `qc_inspections` and `spk` table in Supabase for the updates.</verify>
  <done>Form data persists to DB, and SPK status updates to 'READY_FOR_HANDOVER' when QC passes.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] Uji Kelistrikan check exists in the form.
- [ ] Submitting the form saves data to `qc_inspections` table.
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>
