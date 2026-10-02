---
phase: 2
plan: 2
wave: 1
---

# Plan 2.2: RAB Calculator Backend Integration

## Objective
Mengintegrasikan komponen `RabCalculator` ke backend Supabase agar data estimasi tersimpan secara riil di `rab_estimations` dan `rab_items`. Serta menambahkan fitur kalkulasi **Time-Based Overhead** dengan mengambil tarif dari tabel `workshop_settings`.

## Context
- .gsd/SPEC.md
- src/components/RabCalculator.tsx
- supabase/migrations/20261001000003_wbs_schema.sql

## Tasks

<task type="auto">
  <name>Update RAB Schema for Overhead</name>
  <files>supabase/migrations/20261003000001_add_overhead_to_rab.sql</files>
  <action>
    - Create a new migration file.
    - Add `total_overhead_cost` column (numeric) to `public.rab_estimations` table.
    - Add `overhead_hours` and `overhead_rate` columns (numeric) to `public.rab_items` table.
    - This allows storing the time-based overhead calculation independently.
  </action>
  <verify>grep -q "total_overhead_cost" supabase/migrations/20261003000001_add_overhead_to_rab.sql</verify>
  <done>Schema updated to accommodate overhead variables.</done>
</task>

<task type="auto">
  <name>Integrate RabCalculator to Backend</name>
  <files>src/components/RabCalculator.tsx</files>
  <action>
    - Import Supabase client.
    - On component mount, fetch `bay_hourly_rate` from `workshop_settings` (id=1).
    - Add an "overhead" type option to the item selection alongside material and labor. Or compute it automatically based on labor hours * bay_hourly_rate (follow standard auto body shop practice where overhead is tied to labor hours or total duration). Give the user a way to input overhead hours.
    - Update the `handleAddItem` logic to handle the new fields.
    - In `Save Estimation` button handler, implement `supabase.from('rab_estimations').upsert(...)` and insert corresponding items into `rab_items`.
    - Update SPK's `total_estimated_cost` with the grand total of the RAB.
  </action>
  <verify>grep -q "supabase.from('rab_estimations')" src/components/RabCalculator.tsx</verify>
  <done>RAB can be saved to the database properly with 3 components (Material, Labor, Overhead).</done>
</task>

## Success Criteria
- [ ] Kalkulator bisa memproses dan menyimpan Overhead berbasis waktu.
- [ ] Tombol `Save Estimation` melakukan mutasi ke Supabase (tabel `rab_estimations`, `rab_items`, dan `spk`).
