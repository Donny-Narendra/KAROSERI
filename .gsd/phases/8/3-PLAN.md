---
phase: 8
plan: 3
wave: 2
depends_on: [1]
files_modified:
  - src/pages/GudangDashboard.tsx
  - src/components/RequisitionApproval.tsx
autonomous: true
must_haves:
  truths:
    - "Gudang can approve or reject material requisitions"
  artifacts:
    - "RequisitionApproval.tsx is created"
---

# Plan 8.3: Gudang Requisition Approval

<objective>
Memungkinkan Petugas Gudang (Goods Issue) untuk menyetujui permintaan material dari Mandor dan otomatis mencatatnya ke `inventory_transactions`.
</objective>

<context>
Load for context:
- src/components/GoodsIssueForm.tsx
- .gsd/phases/8/RESEARCH.md
</context>

<tasks>

<task type="auto">
  <name>Create RequisitionApproval Component</name>
  <files>src/components/RequisitionApproval.tsx</files>
  <action>
    Create a component that fetches `material_requisitions` with status 'PENDING'.
    - Displays the requested items (`material_requisition_items`).
    - Provides "Approve" and "Reject" buttons.
    - If "Approve":
      - Change requisition status to 'APPROVED'.
      - Insert records into `inventory_transactions` for each item.
    - If "Reject":
      - Change status to 'REJECTED'.
  </action>
  <verify>Component compiles correctly.</verify>
  <done>Gudang can approve requests which creates inventory transactions.</done>
</task>

<task type="auto">
  <name>Integrate into GudangDashboard</name>
  <files>src/pages/GudangDashboard.tsx</files>
  <action>
    (Create `src/pages/GudangDashboard.tsx` if not exists, else update it or add to app routing).
    Wait, currently Petugas Gudang uses `GoodsIssueForm.tsx` (maybe inside AdminDashboard or somewhere). Let's check where `GoodsIssueForm` is used or create a dedicated GudangDashboard.
    Create `src/pages/GudangDashboard.tsx` that hosts `RequisitionApproval` and `GoodsIssueForm`.
    Update `src/App.tsx` routing if needed for `/gudang`.
  </action>
  <verify>npm run build passes without errors.</verify>
  <done>GudangDashboard displays pending requests.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] Gudang UI can approve requisitions.
- [ ] Approval correctly translates to `inventory_transactions`.
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>
