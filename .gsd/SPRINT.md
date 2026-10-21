# Sprint 66 — Implement 7-Day Post-BAST Expiration for Public Progress Tracking Page

> **Duration**: 2026-10-21 to 2026-10-21
> **Status**: Completed ✅

## Goal
Menerapkan pembatasan masa aktif 7 hari (7 x 24 jam) pasca serah terima kendaraan (BAST / handover) pada portal pelacakan publik `/tracking/:spk_no` untuk memproteksi kerahasiaan metode fabrikasi karoseri internal dari kompetitor, mengalihkan tampilan ke kartu apresiasi resmi purnajual (Thank You State) saat kedaluwarsa, mencatat timestamp pelepasan `released_at` pada tabel `spk`, serta memperbarui indikator tautan pelacakan di portal Kasir.

## Scope

### Included
- **Skema & Mutasi Pelepasan Kendaraan (`supabase/migrations/20261028010000_add_released_at_to_spk.sql`)**:
  - Penambahan kolom `released_at TIMESTAMPTZ` pada tabel `public.spk` beserta indeks `idx_spk_released_at`.
  - Pembaruan tipe `SpkRecord`, `BastSpkData`, `DPHistoryRecord`, dan `KasirSpkViewModel` untuk menyertakan `released_at`.
  - Mutasi otomatis pencatatan `released_at = new Date().toISOString()` saat aksi "Release Vehicle & Print BAST" dieksekusi di `/kasir`.
- **Utilitas Kalkulasi Masa Aktif Tracking (`src/utils/trackingExpiration.ts`)**:
  - Fungsi `checkTrackingExpiration(releasedAtStr?: string | null, currentDate?: Date)` yang presisi menghitung selisih 7 hari (7 x 24 jam).
  - Mengembalikan objek state `isExpired`, `isReleased`, `releasedAt`, `expiresAt`, `daysRemaining`, dan `formattedReleasedDate`.
  - Unit tests komprehensif di `src/utils/__tests__/trackingExpiration.test.ts` (6/6 tests passing).
- **Implementasi Kartu Apresiasi Purnajual di Portal Publik (`src/pages/PublicProgressTracking.tsx`)**:
  - Pembacaan data `released_at` pada saat fetch data SPK publik.
  - Jika `isExpired === true`:
    - Sembunyikan progress bar total WBS, rincian tahapan pengerjaan WBS 1-5, galeri dokumentasi foto, dan tombol "Unduh PDF" di navbar.
    - Render kartu apresiasi purnajual resmi (Thank You State) bertema dark industrial RobelKaroseri dengan badge serah terima, rincian unit, catatan penutupan teknis privasi karoseri, serta kontak layanan purnajual / garansi.
  - Jika belum kedaluwarsa tetapi unit sudah dirilis: menampilkan banner countdown aktif `{daysRemaining} HARI TERSISA`.
- **Pembaruan Indikator Status Tautan di Portal Kasir (`src/pages/KasirDashboard.tsx` & `src/components/DpHistoryList.tsx`)**:
  - Penanda visual status kedaluwarsa tautan (badge `Tautan Kedaluwarsa (Pasca-BAST)`) pada tombol salin link pelacakan jika unit sudah melewati 7 hari pasca BAST.
  - Penanda visual status aktif (`{N}h Aktif`) jika unit telah dirilis tetapi masih dalam masa tenggang 7 hari.
  - Pesan modal konfirmasi yang menjelaskan status tautan saat disalin.
- **Testing & Empirical Validation**:
  - Unit tests untuk `trackingExpiration.ts` (6 tests passing).
  - Component tests untuk `PublicProgressTracking.tsx` (3 tests passing).
  - Tests untuk `DpHistoryList.test.tsx` (6 tests passing) dan `KasirDashboardDpHistory.test.tsx` (5 tests passing).
  - Validasi penuh terhadap seluruh test suite Vitest (44 test suites, 296 tests passing), Oxlint (0 warning/error across 172 files), validasi tipe TypeScript (`tsc -b`), dan Vite production build (409ms).

### Explicitly Excluded
- Mengubah alur inspeksi QC Gate 3 atau batas minimum DP awal.
- Menghapus riwayat transaksi inventaris atau checklist WBS internal dari database bengkel.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Create SQL migration `20261028010000_add_released_at_to_spk.sql` & update types | Antigravity | ✅ Done | 0.4h |
| 2. Implement `trackingExpiration.ts` utility & unit tests | Antigravity | ✅ Done | 0.5h |
| 3. Integrate Thank You State & Expiration Logic in `PublicProgressTracking.tsx` | Antigravity | ✅ Done | 0.8h |
| 4. Update Tracking Link Status Indicators in `KasirDashboard.tsx` & `DpHistoryList.tsx` | Antigravity | ✅ Done | 0.5h |
| 5. Component / Integration Testing & Empirical Validation (Vitest, Oxlint, `tsc -b`, Build) | Antigravity | ✅ Done | 0.6h |

## Daily Log

### 2026-10-21
- Sprint 65 verified and archived to `.gsd/sprints/sprint-65-enable-adding-product-packages-assembly-lists-in-change-order-form.md`.
- Sprint 66 initialized: Implement 7-Day Post-BAST Expiration for Public Progress Tracking Page.
- Task 1: Created database migration `supabase/migrations/20261028010000_add_released_at_to_spk.sql` adding `released_at TIMESTAMPTZ` and index `idx_spk_released_at`. Updated contracts in `src/types/database.ts`, `src/components/BastModal.tsx`, `src/services/billingService.ts`, and `src/pages/KasirDashboard.tsx` (`executeReleaseVehicle` stamps `released_at = new Date().toISOString()`).
- Task 2: Implemented `src/utils/trackingExpiration.ts` with `checkTrackingExpiration` utility and tests in `src/utils/__tests__/trackingExpiration.test.ts` (6 tests passing).
- Task 3: Updated `src/pages/PublicProgressTracking.tsx` to read `released_at`. If expired: hides technical WBS breakdown, photo gallery, and "Unduh PDF" button; displays Thank You State card with handover date, vehicle summary, copyright/privacy notice, and warranty/service assurances. If released but within 7 days: displays green active grace countdown banner. Added tests in `src/pages/__tests__/PublicProgressTracking.test.tsx` (3 tests passing).
- Task 4: Updated `src/pages/KasirDashboard.tsx` and `src/components/DpHistoryList.tsx` with expiration indicators (`Tautan Kedaluwarsa (Pasca-BAST)` / `{N}h Aktif`) and updated copy notification modals. Added tests in `DpHistoryList.test.tsx` and `KasirDashboardDpHistory.test.tsx`.
- Task 5: Empirically validated all 44 test suites (296 tests passing), 0 warnings/errors in Oxlint across 172 files, clean TypeScript `tsc -b` compilation, and Vite production bundle emitted in 409ms.

## Retrospective (end of sprint)

### What Went Well
- Clean separation between core time-delta calculations in `trackingExpiration.ts` and UI views allowed fast unit testing and seamless integration across multiple components (PublicProgressTracking, KasirDashboard, DpHistoryList).
- The Thank You State delivers a premium customer appreciation card that protects proprietary karoseri fabrication techniques without presenting a dead-end 404 or harsh error page to customers.
- Backward compatibility: Existing unreleased SPKs or SPKs released within 7 days retain complete access to their progress reports without disruption.

### What Could Improve
- Future enhancements could allow Service Advisors or Admins to generate a temporary one-time extension link (e.g. +3 days) from the Admin Dashboard if a customer specifically requests re-reviewing their fabrication gallery.

### Action Items
- None; fully complete, empirically verified, and production-ready.

---

*Last updated: 2026-10-21*
