# Summary Plan 2.1
- Added `vehicle_vin` and `vehicle_engine` to `spk` table via migration `20261003000000_add_vin_engine_to_spk.sql`.
- Updated `SpkForm.tsx` with inputs and state variables for VIN and Engine Number.
- Modified `supabase.insert` to submit these new fields upon creation.
