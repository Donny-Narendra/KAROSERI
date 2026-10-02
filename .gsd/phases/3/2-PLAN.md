---
phase: 3
plan: 2
wave: 2
depends_on: []
files_modified:
  - src/components/GoodsIssueForm.tsx
autonomous: true
must_haves:
  truths:
    - Goods Issue form reads actual RAB data.
    - Material issuance limits are enforced using real DB data, not mock data.
    - Submitting records an inventory_transaction.
  artifacts:
    - src/components/GoodsIssueForm.tsx
---

# Plan 3.2: Goods Issue & RAB Validation

<objective>
Menghubungkan form Pengeluaran Barang (`GoodsIssueForm.tsx`) dengan estimasi RAB yang tersimpan di backend. Memastikan batas penarikan logistik sesuai dengan limit estimasi RAB aktual + waste factor.

Purpose: Menegakkan Hard-Gate 2 (Validasi Logistik vs RAB) agar material tidak bisa keluar jika melebihi RAB tanpa persetujuan (Change Order).
Output: GoodsIssueForm yang mengambil `rab_items` aktual dan melakukan insert ke `inventory_transactions`.
</objective>

<context>
Load for context:
- src/components/GoodsIssueForm.tsx
- supabase/migrations/20261001000004_phase4_schema.sql (inventory_transactions)
- supabase/migrations/20261001000003_wbs_schema.sql (rab_estimations, rab_items)
</context>

<tasks>

<task type="auto">
  <name>Connect Goods Issue Form to DB</name>
  <files>src/components/GoodsIssueForm.tsx</files>
  <action>
    - Import `useAuth` to get current user for `issued_by`.
    - Replace `MOCK_MATERIALS` and `MOCK_RAB_DATA` logic with real Supabase queries.
    - When an SPK is selected, query its corresponding `rab_estimations` and `rab_items` (type = 'material') to get the allowed list of materials and quantities.
    - Query `inventory_transactions` for the selected SPK and Material to sum up the previously `issuedQty`.
    - Update `handleSubmit` to insert into `inventory_transactions` (`spk_id`, `material_id`, `quantity_issued`, `issued_by`).
  </action>
  <verify>grep -q "supabase.from('inventory_transactions')" src/components/GoodsIssueForm.tsx</verify>
  <done>Form retrieves real RAB limits and correctly validates before inserting transactions.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] MOCK data is fully removed.
- [ ] Users can only issue materials up to the allowed RAB limit + waste factor.
- [ ] Over-budget attempts are visually blocked and submit is disabled.
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>
