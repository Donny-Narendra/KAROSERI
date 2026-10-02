---
phase: 3
plan: 3
wave: 2
depends_on: [2]
files_modified:
  - supabase/migrations/20261003000002_add_stockout_threshold.sql
  - src/pages/WarehouseDashboard.tsx
  - src/components/GoodsReturnForm.tsx
autonomous: true
must_haves:
  truths:
    - The warehouse can process returned materials.
    - Stockout threshold logic exists for materials.
  artifacts:
    - supabase/migrations/20261003000002_add_stockout_threshold.sql
    - src/components/GoodsReturnForm.tsx
---

# Plan 3.3: Material Return & Stockout Warning

<objective>
Menambahkan fitur Manajemen Retur Material dan Peringatan Stockout (Stok Kritis) di Dashboard Petugas Gudang.

Purpose: Menutup gap fitur pergudangan pada Wave 2.
Output: Komponen baru `GoodsReturnForm` dan penambahan kolom `minimum_stock` pada tabel `materials`.
</objective>

<context>
Load for context:
- src/pages/WarehouseDashboard.tsx
- supabase/migrations/20261001000003_wbs_schema.sql (materials)
</context>

<tasks>

<task type="auto">
  <name>Update Schema for Stock Threshold</name>
  <files>supabase/migrations/20261003000002_add_stockout_threshold.sql</files>
  <action>
    - Create a new migration file.
    - Add `current_stock` numeric DEFAULT 0 and `minimum_stock` numeric DEFAULT 0 columns to `public.materials` table.
    - Add trigger or RPC if necessary, or just rely on the columns. For simplicity, just add the columns. We can update `current_stock` via application logic when goods are issued/returned, or use DB triggers. For now, just add the columns.
  </action>
  <verify>grep -q "minimum_stock" supabase/migrations/20261003000002_add_stockout_threshold.sql</verify>
  <done>Schema can store current and minimum stock thresholds.</done>
</task>

<task type="auto">
  <name>Create GoodsReturnForm Component</name>
  <files>src/components/GoodsReturnForm.tsx</files>
  <action>
    - Create a new component similar to `GoodsIssueForm`.
    - It allows returning unused materials for a specific SPK.
    - When submitted, it records an `inventory_transactions` entry with a NEGATIVE `quantity_issued` (which represents a return).
  </action>
  <verify>grep -q "GoodsReturnForm" src/components/GoodsReturnForm.tsx</verify>
  <done>Form created and can insert negative inventory transactions.</done>
</task>

<task type="auto">
  <name>Update WarehouseDashboard</name>
  <files>src/pages/WarehouseDashboard.tsx</files>
  <action>
    - Import and render `GoodsReturnForm` alongside or togglable with `GoodsIssueForm`.
    - Add a new widget or section to display "Low Stock Warnings" by querying `materials` where `current_stock <= minimum_stock`.
  </action>
  <verify>grep -q "Low Stock Warnings" src/pages/WarehouseDashboard.tsx</verify>
  <done>Dashboard shows stockout warnings and allows material returns.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] Materials table has threshold columns.
- [ ] Returns can be processed.
- [ ] Dashboard warns if stock is low.
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>
