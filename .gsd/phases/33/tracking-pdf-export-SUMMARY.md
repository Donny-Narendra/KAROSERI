---
phase: 33
plan: tracking-pdf-export
completed_at: 2026-10-09T21:58:37+07:00
duration_minutes: 5
---

# Summary: Fix: Portal Publik Laporan Progres Pengerjaan Unit via Nomor Rangka & Generator PDF Progres

## Results
- 4 tasks completed
- All verifications passed

## Tasks Completed
| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | Pembuatan Halaman & Route Tracking Publik | `70e0513` | ✅ |
| 2 | Mekanisme Rate Limiting Akses & Download | `70e0513` | ✅ |
| 3 | Modul Generator Cetak PDF Laporan Progres | `70e0513` | ✅ |
| 4 | Integrasi Halaman Kasir (Tombol Salin Tautan) | `70e0513` | ✅ |

## Deviations Applied
- Untuk mekanisme render PDF, alih-alih menggunakan library pihak ketiga seperti `html2pdf.js` yang mungkin menyebabkan dependency bloat, kita memanfaatkan kapabilitas `window.print()` standar peramban dengan menggunakan `CSS @media print` secara ekstensif (menyembunyikan nav/border, menyesuaikan warna bg). Ini menghasilkan PDF/Print native tanpa beban librari tambahan.

## Files Changed
- `src/App.tsx` - Added `/tracking/:vin` route.
- `src/pages/PublicProgressTracking.tsx` - Created public tracking dashboard page with print styles and localStorage rate-limiting.
- `src/pages/KasirDashboard.tsx` - Re-mapped `vehicle_number` to `vin` in formatting and added a "Salin Tautan Pelacakan" action button for non-DRAFT SPKs that have received DP.
- `supabase/migrations/20261009070002_phase33_public_tracking.sql` - Added RLS policies to allow the `anon` (public) role to read `spk`, `wbs_checklists`, and `spk_assets` based on strict conditions (`status != DRAFT` and `dp_amount > 0`).

## Verification
- URL publik `tracking/:vin` berhasil dibangun dan menampilkan progres dengan baik.
- SPK berstatus DRAFT atau belum membayar DP akan diblokir oleh RLS dan memunculkan error "SPK Belum Aktif".
- Buka tautan melebihi 5 kali sehari memicu perlindungan rate-limit `localStorage`.
- Kasir bisa dengan mudah menyalin link dengan klik tombol di UI Billing Calculator.
