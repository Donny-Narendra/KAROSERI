# Sprint 60 — Add Vehicle Model Input Field to New SPK Registration Form

> **Duration**: 2026-10-21 to 2026-10-21
> **Status**: In Progress

## Goal
Menambahkan field input "VEHICLE MODEL" pada form pendaftaran SPK baru (`SpkForm.tsx`) di `/service-advisor`, memastikan skema database `public.spk` memiliki kolom `vehicle_model` & `vehicle_brand`, mengikat nilai state form, dan mengirimkannya dalam payload mutasi `INSERT` ke Supabase agar modul kasir (kuitansi DP), modul cetak BAST, dan pelacakan konsumen dapat mengidentifikasi fisik unit kendaraan dengan akurat.

## Scope

### Included
- **Supabase Database Migration**:
  - Buat file migrasi `supabase/migrations/20261025010000_ensure_vehicle_model_in_spk.sql` untuk menambahkan kolom `vehicle_model TEXT` dan `vehicle_brand TEXT` pada tabel `public.spk`.
- **TypeScript Type Definitions**:
  - Tambahkan `vehicle_model` dan `vehicle_brand` pada `SpkRecord` (`src/types/database.ts`) dan `Spk` (`src/types/spk.ts`).
- **Service Layer Alignment**:
  - Perbarui `spkService.ts` (`UpdateSpkCredentialsParams` dan payload `updateSpkCredentials`) untuk mendukung `vehicle_model` dan `vehicle_brand`.
- **UI Form & Credential Alignment**:
  - Tambahkan input field `VEHICLE MODEL` pada `SpkForm.tsx` lengkap dengan state handling, reset form, dan pengiriman payload `INSERT` serta `UPDATE`.
  - Perbarui `SpkCredentialSection.tsx` agar menampilkan dan mengedit data `vehicle_model`.
  - Perbarui pemetaan `vehicleModel` pada `KasirDashboard.tsx` dan dokumen serah terima `BastModal.tsx`.
- **Testing & Verification**:
  - Buat unit test untuk `SpkForm` yang memverifikasi keberadaan input field VEHICLE MODEL dan penyertaan nilai input dalam payload INSERT `supabase.from('spk').insert(...)`.
  - Jalankan seluruh rangkaian test Vitest, linter Oxlint, dan build TypeScript/Vite.

### Explicitly Excluded
- Mengubah alur otentikasi login atau hak akses role Service Advisor.
- Menghapus kolom data kendaraan yang sudah ada sebelumnya (seperti `vehicle_plate`, `vin_chassis`, dll).

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Supabase Database Migration (`20261025010000_ensure_vehicle_model_in_spk.sql`) | Antigravity | ✅ Done | 0.2h |
| 2. Update Type Definitions (`database.ts`, `spk.ts`) & Service Layer (`spkService.ts`) | Antigravity | ✅ Done | 0.2h |
| 3. Add VEHICLE MODEL Input Field & Binding in `SpkForm.tsx` | Antigravity | ✅ Done | 0.4h |
| 4. Align `SpkCredentialSection.tsx`, `KasirDashboard.tsx`, & `BastModal.tsx` | Antigravity | ✅ Done | 0.3h |
| 5. Testing & Empirical Validation (Vitest, Oxlint, Build) | Antigravity | ✅ Done | 0.4h |

## Daily Log

### 2026-10-21
- Initialized Sprint 60: Add Vehicle Model Input Field to New SPK Registration Form.
- Task 1: Created database migration `supabase/migrations/20261025010000_ensure_vehicle_model_in_spk.sql` adding `vehicle_model TEXT` and `vehicle_brand TEXT` columns with idempotency check and PostgREST schema cache reload notification (`NOTIFY pgrst, 'reload schema'`).
- Task 2: Updated TypeScript definitions:
  - `src/types/database.ts`: Added `vehicle_model?: string | null;` and `vehicle_brand?: string | null;` to `SpkRecord`.
  - `src/types/spk.ts`: Added `vehicle_model?: string;` and `vehicle_brand?: string;` to `Spk`.
  - `src/services/spkService.ts`: Added `vehicleModel?: string | null;` and `vehicleBrand?: string | null;` to `UpdateSpkCredentialsParams` and mapped to `vehicle_model` / `vehicle_brand` in `updateSpkCredentials` mutation payload.
  - `src/services/rabService.ts`: Added `vehicle_model` and `vehicle_brand` to `RabSpkDetails`.
- Task 3: Added VEHICLE MODEL field in `src/components/SpkForm.tsx`:
  - Added state `vehicleModel` initialized from `initialData.vehicle_model`.
  - Placed input field in Row 3 alongside `Vehicle Plate`, pairing vehicle identification and leaving Row 4 for `VIN / Chassis Number` and `Engine Number`.
  - Added `htmlFor` and `id` tags (`id="vehicle-model"`, `id="target-date"`, etc.) for accessibility and testability.
  - Bound `vehicle_model: vehicleModel.trim() || null` in the Supabase `insert` payload and reset state upon registration.
  - Passed `vehicleModel` in edit mode update handler.
- Task 4: Aligned downstream components:
  - `src/components/SpkCredentialSection.tsx`: Added `vehicleModel` state, rendered dedicated "Model Kendaraan" column in View Mode (6-column responsive grid), and added editable input in Edit Mode.
  - `src/pages/KasirDashboard.tsx`: Added `vehicle_model` & `vehicle_brand` to `KasirSpkJoinRow`, prioritized `d.vehicle_model` over `vehicle_plate` for `vehicleModel`.
  - `src/components/BastModal.tsx`: Added `vehicle_model` & `vehicleModel` to `BastSpkData`, displayed "Model Kendaraan" row in the vehicle specification table.
  - `src/pages/ServiceAdvisorDashboard.tsx`: Displayed `spk.vehicle_model` under `spk.vehicle_plate` in the Recent SPKs table.
  - `src/utils/rabExport.ts`: Added `vehicle_model` to `RabExportSpkDetails`, Excel export header, and quotation print layout.
- Task 5: Testing & Empirical Validation:
  - Created `src/components/__tests__/SpkForm.test.tsx` with 5 tests verifying render, input typing, payload insertion, edit mode, and credential section.
  - Vitest: 38/38 test files passing, 241/241 tests passing (100%).
  - Oxlint: 0 errors, 0 warnings across 162 files.
  - Production build: `tsc -b && vite build` clean build in 758ms.
