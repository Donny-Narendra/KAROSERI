---
phase: 34
plan: refactor-tracking-spk-no
completed_at: 2026-10-09T22:08:57+07:00
duration_minutes: 2
---

# Summary: Fix: Refactor Parameter URL Publik Pelacakan Progres ke SPK No

## Results
- 3 tasks completed
- All verifications passed

## Tasks Completed
| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | Penyesuaian Router Endpoint | `d776c1d` | ✅ |
| 2 | Perbarui Komponen PublicProgressTracking | `d776c1d` | ✅ |
| 3 | Penyesuaian Tombol Tautan di KasirDashboard | `d776c1d` | ✅ |

## Deviations Applied
- None.

## Files Changed
- `src/App.tsx` - Ubah path `/tracking/:vin` ke `/tracking/:spk_no`.
- `src/pages/PublicProgressTracking.tsx` - Ganti `useParams` untuk ambil `spk_no`. Ubah rate limit key dan klausa Supabase `.eq('spk_no', spk_no)`.
- `src/pages/KasirDashboard.tsx` - Ganti URL pada `navigator.clipboard.writeText` agar menggunakan `selectedSpk.id` (SPK No).

## Verification
- URL tracking sekarang menjadi `/tracking/SPK-...`.
- Tautan yang disalin di Dashboard Kasir terhubung sempurna dan parameter cocok di endpoint.
- Rate-limiting bekerja spesifik per nomor SPK.
