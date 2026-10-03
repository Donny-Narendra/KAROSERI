---
phase: 8
plan: 5
wave: 4
depends_on: [1]
files_modified:
  - src/components/SpkBoronganPanel.tsx
  - src/pages/MandorDashboard.tsx
autonomous: true
must_haves:
  truths:
    - "Mandor can assign SPK Borongan, print it, and do Opname Fisik (Cut-Off)"
  artifacts:
    - "SpkBoronganPanel.tsx is created"
---

# Plan 8.5: SPK Borongan Management

<objective>
Membuat modul penugasan SPK Borongan (SPK-B) per WBS, cetak SPK-B, dan Opname Fisik (Re-assign).
</objective>

<context>
Load for context:
- src/pages/MandorDashboard.tsx
- .gsd/phases/8/RESEARCH.md
</context>

<tasks>

<task type="auto">
  <name>Create SpkBoronganPanel Component</name>
  <files>src/components/SpkBoronganPanel.tsx</files>
  <action>
    Create a component to manage `spk_borongan`.
    - Form to create new SPK-B (worker name, contract value).
    - List active SPK-B for the current SPK & WBS Category.
    - Button to "Cetak SPK-B" (triggers `window.print()` with a printable layout).
    - Button for "Opname Fisik (Cut-Off)" that takes a progress percentage, sets the current SPK-B to 'CUT_OFF', and allows creating a new one.
  </action>
  <verify>Component compiles correctly.</verify>
  <done>UI for SPK-B assignment and Cut-off exists.</done>
</task>

<task type="auto">
  <name>Integrate into MandorDashboard</name>
  <files>src/pages/MandorDashboard.tsx</files>
  <action>
    Add `SpkBoronganPanel` into the WBS section in `MandorDashboard`, similar to the checklist and material requisition panels.
  </action>
  <verify>npm run build passes.</verify>
  <done>MandorDashboard includes SPK Borongan management.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] Mandor can create SPK-B and print it.
- [ ] Opname Fisik correctly updates status to CUT_OFF.
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>
