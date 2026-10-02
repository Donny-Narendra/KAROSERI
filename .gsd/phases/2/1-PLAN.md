---
phase: 2
plan: 1
wave: 1
---

# Plan 2.1: SPK Form Enhancements (VIN & Engine Number)

## Objective
Menambahkan field pencatatan Vehicle Identification Number (VIN) / Sasis dan Nomor Mesin pada formulir penerimaan SPK awal untuk melengkapi data registrasi kendaraan masuk sesuai kebutuhan operasional.

## Context
- .gsd/SPEC.md
- .gsd/ARCHITECTURE.md
- src/components/SpkForm.tsx

## Tasks

<task type="auto">
  <name>Update SPK Database Schema</name>
  <files>supabase/migrations/20261003000000_add_vin_engine_to_spk.sql</files>
  <action>
    - Create a new migration file to add `vehicle_vin` and `vehicle_engine` columns to the `public.spk` table.
    - Set them as `text` and nullable for backward compatibility or make them required with a default if needed (prefer nullable if not all vehicles have them, though PRD asks for them, we can allow null at DB level).
  </action>
  <verify>grep -q "ALTER TABLE public.spk" supabase/migrations/20261003000000_add_vin_engine_to_spk.sql</verify>
  <done>Migration script exists and alters the spk table correctly.</done>
</task>

<task type="auto">
  <name>Enhance SpkForm.tsx</name>
  <files>src/components/SpkForm.tsx</files>
  <action>
    - Add state variables for `vehicleVin` and `vehicleEngine`.
    - Add input fields for VIN/Sasis and Nomor Mesin in the UI grid.
    - Update the `supabase.from('spk').insert(...)` call to include `vehicle_vin` and `vehicle_engine`.
  </action>
  <verify>grep -q "vehicle_vin" src/components/SpkForm.tsx</verify>
  <done>VIN and Engine fields are captured in UI and submitted to the backend.</done>
</task>

## Success Criteria
- [ ] Database memiliki kolom `vehicle_vin` dan `vehicle_engine` di tabel `spk`.
- [ ] Form Check-in SPK dapat menerima input VIN dan Mesin, dan berhasil disave.
