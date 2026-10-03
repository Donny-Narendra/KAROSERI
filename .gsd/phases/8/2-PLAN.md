---
phase: 8
plan: 2
wave: 2
depends_on: [1]
files_modified:
  - src/pages/MandorDashboard.tsx
  - src/components/MaterialRequisitionForm.tsx
autonomous: true
must_haves:
  truths:
    - "Mandor can submit a material requisition for an active SPK WBS"
  artifacts:
    - "MaterialRequisitionForm.tsx is created"
---

# Plan 8.2: Mandor Material Requisition

<objective>
Memungkinkan Mandor untuk meminta material (requisition) per WBS pada SPK aktif.
</objective>

<context>
Load for context:
- src/pages/MandorDashboard.tsx
- .gsd/phases/8/RESEARCH.md
</context>

<tasks>

<task type="auto">
  <name>Create MaterialRequisitionForm Component</name>
  <files>src/components/MaterialRequisitionForm.tsx</files>
  <action>
    Create a new component `MaterialRequisitionForm`.
    - Accepts `spkId` and `wbsCategory`.
    - Allows Mandor to select multiple materials and specify quantities.
    - Saves to `material_requisitions` (status 'PENDING') and `material_requisition_items`.
    - Use `supabase` client.
  </action>
  <verify>Component compiles correctly (npm run build).</verify>
  <done>Component allows multi-item request insertion into DB.</done>
</task>

<task type="auto">
  <name>Integrate Requisition into MandorDashboard</name>
  <files>src/pages/MandorDashboard.tsx</files>
  <action>
    Import and render `MaterialRequisitionForm` inside the WBS panel of `MandorDashboard`.
    - Ensure it is only visible when an SPK is selected and a WBS category is active.
    - Add a button "Minta Material" that opens a modal or panel showing the form.
  </action>
  <verify>npm run build passes without errors.</verify>
  <done>Mandor UI includes material requisition feature.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] Material requisition component exists and compiles.
- [ ] MandorDashboard includes the new feature.
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>
