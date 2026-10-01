---
phase: 5
plan: 2
wave: 2
---

# Plan 5.2: QC Inspection Form (Mandor Tablet)

## Objective
Provide the Mandor with a dynamic QC inspection form that utilizes the JSONB schema for flexible checks (Shower Test, Hidrolik, dll).

## Context
- .gsd/SPEC.md
- src/pages/MandorDashboard.tsx

## Tasks

<task type="auto">
  <name>Create QC Inspection Form Component</name>
  <files>src/components/QcInspectionForm.tsx</files>
  <action>
    - Build `QcInspectionForm.tsx` that takes an `spkId`.
    - Render a form with dynamic parameters (e.g., "Shower Test Anti Bocor", "Uji Hidrolik", "Dimensi Kendaraan") mapping to a JSON object.
    - Include a submit button that would save the payload to the `qc_inspections` table as JSONB with a final status of PASS or FAIL.
    - Use Mock Data for the demonstration since Supabase API isn't fully linked.
  </action>
  <verify>cat src/components/QcInspectionForm.tsx</verify>
  <done>Component `QcInspectionForm.tsx` is created and correctly manages a dynamic JSON state for QC checks.</done>
</task>

<task type="auto">
  <name>Integrate QC Form to Mandor Dashboard</name>
  <files>src/pages/MandorDashboard.tsx</files>
  <action>
    - Add the `QcInspectionForm` below the `WbsChecklist` in `MandorDashboard.tsx` for the selected SPK.
  </action>
  <verify>npm run build</verify>
  <done>Dashboard builds successfully with the integrated QC form.</done>
</task>

## Success Criteria
- [ ] Mandor can fill out dynamic QC parameters.
- [ ] The dashboard builds with zero TypeScript errors.
