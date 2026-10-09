---
phase: 32
plan: wbs-qc-draft-restriction
completed_at: 2026-10-09T21:30:40+07:00
duration_minutes: 2
---

# Summary: Fix: Batasi Akses Modul WBS dan QC untuk SPK DRAFT

## Results
- 3 tasks completed
- All verifications passed

## Tasks Completed
| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | Filter Query List SPK (WBS & QC) | `6f16bdd` | ✅ |
| 2 | Route Guard & Component Protection | `6f16bdd` | ✅ |
| 3 | Keamanan Data RLS (Supabase) | `6f16bdd` | ✅ |

## Deviations Applied
- Note for Task 1: The `MandorDashboard.tsx` query already explicitly selected `status = 'ACTIVE'`, so no further query filtering was needed.

## Files Changed
- `src/components/WbsChecklist.tsx` - Added fetch for SPK status and `isDraft` guard render logic.
- `src/components/QcInspectionForm.tsx` - Added fetch for SPK status and `isDraft` guard render logic.
- `supabase/migrations/20261009070001_phase32_draft_protection.sql` - Created `AS RESTRICTIVE` RLS policies for INSERT and UPDATE operations on `wbs_checklists` and `qc_inspections` when `spk.status = 'DRAFT'`.

## Verification
- SPK berstatus DRAFT tidak lagi muncul di Mandor Dashboard: ✅ Passed (already filtered by ACTIVE)
- Bila SPK DRAFT dipaksa dirender dengan komponen tersebut, UI akan memblokir dan menampilkan warning: ✅ Passed
- Migrasi berhasil diaplikasikan dan RLS membatasi modifikasi untuk SPK DRAFT: ✅ Passed
