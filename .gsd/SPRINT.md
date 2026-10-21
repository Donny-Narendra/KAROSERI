# Sprint 66 — Implement 7-Day Post-BAST Expiration for Public Progress Tracking Page

> **Duration**: 2026-10-21 to 2026-10-21
> **Status**: In Progress

## Goal
Menerapkan pembatasan masa aktif 7 hari (7 x 24 jam) pasca serah terima kendaraan (BAST / handover) pada portal pelacakan publik `/tracking/:spk_no` untuk memproteksi kerahasiaan metode fabrikasi karoseri internal dari kompetitor, mengalihkan tampilan ke kartu apresiasi resmi purnajual (Thank You State) saat kedaluwarsa, mencatat timestamp pelepasan `released_at` pada tabel `spk`, serta memperbarui indikator tautan pelacakan di portal Kasir.

## Scope

### Included
- **Skema & Mutasi Pelepasan Kendaraan (`supabase/migrations/20261028010000_add_released_at_to_spk.sql`)**:
  - Penambahan kolom `released_at TIMESTAMPTZ` pada tabel `public.spk`.
  - Pembaruan tipe `SpkRecord` dan `KasirSpkViewModel` untuk menyertakan `released_at`.
  - Mutasi otomatis pencatatan `released_at = new Date().toISOString()` saat aksi "Release Vehicle & Print BAST" dieksekusi di `/kasir`.
- **Utilitas Kalkulasi Masa Aktif Tracking (`src/utils/trackingExpiration.ts`)**:
  - Fungsi `checkTrackingExpiration(releasedAtStr?: string | null, currentDate?: Date)` yang presisi menghitung selisih 7 hari (7 x 24 jam).
  - Mengembalikan objek state `isExpired`, `releasedAt`, `expiresAt`, `daysRemaining`, dan `formattedReleasedDate`.
  - Unit tests komprehensif di `src/utils/__tests__/trackingExpiration.test.ts`.
- **Implementasi Kartu Apresiasi Purnajual di Portal Publik (`src/pages/PublicProgressTracking.tsx`)**:
  - Pembacaan data `released_at` pada saat fetch data SPK publik.
  - Jika `isExpired === true`:
    - Sembunyikan progress bar total WBS, rincian tahapan pengerjaan WBS 1-5, galeri dokumentasi foto, dan tombol "Unduh PDF" di navbar.
    - Render kartu apresiasi purnajual resmi (Thank You State) bertema dark industrial RobelKaroseri dengan badge serah terima, rincian unit, catatan penutupan teknis privasi karoseri, serta kontak layanan purnajual / garansi.
- **Pembaruan Indikator Status Tautan di Portal Kasir (`src/pages/KasirDashboard.tsx` & `src/components/DpHistoryList.tsx`)**:
  - Penanda visual status kedaluwarsa tautan (badge `Tautan Kedaluwarsa`) pada tombol salin link pelacakan jika unit sudah melewati 7 hari pasca BAST.
- **Testing & Empirical Validation**:
  - Unit tests untuk `trackingExpiration.ts`.
  - Component tests untuk `PublicProgressTracking.tsx` (skenario aktif vs skenario kedaluwarsa).
  - Integration tests di KasirDashboard.
  - Validasi penuh terhadap seluruh test suite Vitest, Oxlint (0 warning/error), validasi tipe TypeScript (`tsc -b`), dan Vite production build.

### Explicitly Excluded
- Mengubah alur inspeksi QC Gate 3 atau batas minimum DP awal.
- Menghapus riwayat transaksi inventaris atau checklist WBS internal dari database bengkel.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Create SQL migration `20261028010000_add_released_at_to_spk.sql` & update types | Antigravity | ⬜ Todo | 0.4h |
| 2. Implement `trackingExpiration.ts` utility & unit tests | Antigravity | ⬜ Todo | 0.5h |
| 3. Integrate Thank You State & Expiration Logic in `PublicProgressTracking.tsx` | Antigravity | ⬜ Todo | 0.8h |
| 4. Update Tracking Link Status Indicators in `KasirDashboard.tsx` & `DpHistoryList.tsx` | Antigravity | ⬜ Todo | 0.5h |
| 5. Component / Integration Testing & Empirical Validation (Vitest, Oxlint, `tsc -b`, Build) | Antigravity | ⬜ Todo | 0.6h |

## Daily Log

### 2026-10-21
- Sprint 65 verified and archived to `.gsd/sprints/sprint-65-enable-adding-product-packages-assembly-lists-in-change-order-form.md`.
- Sprint 66 initialized: Implement 7-Day Post-BAST Expiration for Public Progress Tracking Page.
