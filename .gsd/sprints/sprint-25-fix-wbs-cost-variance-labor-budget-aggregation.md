# Sprint 25 — Fix view_wbs_cost_variance Aggregation for Labor Budget

> **Duration**: 2026-10-17 to 2026-10-17
> **Status**: Completed ✅

## Goal
Perbaiki agregasi SQL View `view_wbs_cost_variance` agar mengagregasi item `MATERIAL` dan `NULL` ke `rab_material_budget`, serta mengagregasi item `LABOR` ke `rab_labor_budget`, sehingga kolom "PAGU JASA" di `/finance-reports` tab "Varian Anggaran WBS" tidak lagi bernilai Rp 0 dan varian surplus/defisit terhitung secara presisi terhadap realisasi aktual gudang dan SPK Borongan.

## Scope

### Included
- **Database Migration**:
  - File migrasi `supabase/migrations/20261016050000_fix_wbs_cost_variance_labor_view.sql`.
  - Agregasi `rab_budget`:
    - `rab_material_budget`: `COALESCE(SUM(CASE WHEN item_type = 'MATERIAL' OR item_type IS NULL THEN quantity * unit_price ELSE 0 END), 0)`.
    - `rab_labor_budget`: `COALESCE(SUM(CASE WHEN item_type = 'LABOR' THEN quantity * unit_price ELSE 0 END), 0)`.
  - Agregasi `co_budget`:
    - `co_material_budget`: `COALESCE(SUM(CASE WHEN item_type = 'MATERIAL' OR item_type IS NULL THEN quantity * unit_price ELSE 0 END), 0)`.
    - `co_labor_budget`: `COALESCE(SUM(CASE WHEN item_type = 'LABOR' THEN quantity * unit_price ELSE 0 END), 0)`.
  - Realisasi aktual:
    - `actual_material_spent` dari `material_issues`.
    - `actual_labor_spent` dari `spk_borongan`.
  - Formula varian:
    - `material_variance = total_material_budget - actual_material_spent`.
    - `labor_variance = total_labor_budget - actual_labor_spent`.
  - Grant permissions: `GRANT SELECT ON view_wbs_cost_variance TO authenticated;`.
- **Database Execution & Empirical Verification**:
  - Terapkan migrasi ke database PostgreSQL.
  - Skrip pengujian otomatis `verify_labor_view_fix.cjs` memverifikasi definisi view, schema columns, data query live (39 baris, 20 tahapan WBS dengan pagu jasa aktif), dan hak akses `authenticated`.
  - Regression test suite `verify_financial_reporting_views.cjs` lolos 100%.
- **Frontend & Service Compatibility**:
  - `src/services/financialReportsService.ts` dan `src/components/finance/tabs/WbsCostVarianceTab.tsx` membaca `total_labor_budget`, `actual_labor_spent`, dan `labor_variance` tanpa perubahan antarmuka.
- **Automated Testing & Build**:
  - Menambahkan unit tests di `src/utils/__tests__/rabLaborBudget.test.ts` (87/87 tests passed).
  - TypeScript build (`tsc -b && vite build`) sukses tanpa error.
  - Linting (`npm run lint`) 0 error.

### Explicitly Excluded
- Mengubah skema invoice billing atau payment collection.
- Mengubah alur persetujuan SPK Borongan atau mutasi stok fisik gudang.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Buat file migrasi SQL `supabase/migrations/20261016050000_fix_wbs_cost_variance_labor_view.sql` | Antigravity | ✅ Done | 0.2h |
| 2. Eksekusi migrasi ke PostgreSQL aktif dan verifikasi definisi view | Antigravity | ✅ Done | 0.2h |
| 3. Verifikasi empiris live data, varian surplus/defisit, dan izin SELECT `authenticated` | Antigravity | ✅ Done | 0.2h |
| 4. Update unit test `rabLaborBudget.test.ts` untuk memverifikasi logika agregasi SQL view | Antigravity | ✅ Done | 0.2h |
| 5. Jalankan `npm test`, `npm run lint`, dan `npm run build` | Antigravity | ✅ Done | 0.2h |

## Daily Log

### 2026-10-17
- Membuka Sprint 25: Fix view_wbs_cost_variance Aggregation for Labor Budget.
- Menulis file migrasi Supabase `supabase/migrations/20261016050000_fix_wbs_cost_variance_labor_view.sql`.
- Menerapkan migrasi langsung ke PostgreSQL cloud instance (`process.env.DATABASE_URL`).
- Menguji query live dari `view_wbs_cost_variance`:
  - 39 baris data terkueri dengan tepat.
  - 20 tahapan WBS memiliki `total_labor_budget` aktif (> Rp 0), misalnya SPK-5902 dan SPK-6633.
  - Perhitungan selisih varian `total_budget - actual_spent` terbukti akurat 100% pada semua baris.
  - Izin akses `GRANT SELECT TO authenticated` diverifikasi aktif.
- Menambahkan test case untuk logika agregasi SQL view di `src/utils/__tests__/rabLaborBudget.test.ts`.
- Menjalankan pengujian:
  - Vitest: 87/87 test lulus (11 test files).
  - Linter: 0 error.
  - Build: Sukses (`tsc -b && vite build`).

## Retrospective (2026-10-17)

### What Went Well
- View `view_wbs_cost_variance` kini secara akurat memisahkan item `MATERIAL` (termasuk legacy row dengan `item_type IS NULL`) dan `LABOR`.
- Kolom "PAGU JASA" di halaman laporan keuangan (`/finance-reports` tab "Varian Anggaran WBS") kini menampilkan nilai anggaran jasa riil dari RAB item `LABOR`.
- Varian biaya jasa (`labor_variance`) secara presisi menghitung selisih surplus/defisit terhadap akumulasi SPK Borongan (`actual_labor_spent`).
- Seluruh 87 tests lulus dan zero lint errors.

### What Could Improve
- Terus pantau bilamana ada change order masa depan bertipe baru di luar `MATERIAL` dan `LABOR`.

### Action Items
- [x] Pastikan migrasi tersimpan di repositori git.
- [x] Perbarui `.gsd/STATE.md`.
