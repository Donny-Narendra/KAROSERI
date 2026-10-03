---
phase: 8
plan: 4
wave: 3
depends_on: [1]
files_modified:
  - src/pages/KasirDashboard.tsx
  - src/pages/AdminDashboardPage.tsx
autonomous: true
must_haves:
  truths:
    - "Customer supplied materials cost Rp 0 in actual costing"
  artifacts:
    - "KasirDashboard.tsx is updated"
---

# Plan 8.4: Customer Supplied Material Integration

<objective>
Memastikan material yang dibawa oleh konsumen (`is_customer_supplied = true`) tidak ditagihkan biayanya dan dihitung Rp 0 di sistem tagihan & dashboard.
</objective>

<context>
Load for context:
- src/pages/KasirDashboard.tsx
- src/pages/AdminDashboardPage.tsx
</context>

<tasks>

<task type="auto">
  <name>Update Costing Logic in KasirDashboard</name>
  <files>src/pages/KasirDashboard.tsx</files>
  <action>
    When calculating actual material cost from `inventory_transactions` joined with `materials`, ensure that if `materials.is_customer_supplied` is true, the cost is calculated as 0 instead of `unit_price * quantity_issued`.
    - Modify the Supabase query or JS logic that aggregates the bill.
  </action>
  <verify>npm run build passes.</verify>
  <done>Final billing excludes cost of customer supplied materials.</done>
</task>

<task type="auto">
  <name>Update Costing Logic in AdminDashboardPage</name>
  <files>src/pages/AdminDashboardPage.tsx</files>
  <action>
    Ensure the actual cost chart/metrics also ignore or zero out costs for `is_customer_supplied` materials.
  </action>
  <verify>npm run build passes.</verify>
  <done>Admin Dashboard Actual Cost reflects Rp 0 for customer materials.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] Both Kasir and Admin dashboards calculate cost correctly accounting for the flag.
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>
