# Sprint 65 — Enable Adding Product Packages (Assembly Lists) in Change Order Form

> **Duration**: 2026-10-21 to 2026-10-21
> **Status**: Completed

## Goal
Menambahkan tombol aksi `+ Paket Barang Jadi (Assembly List)` di toolbar formulir Change Order, membuka modal pemilihan paket assembly dari master `product_packages`, dan meledakkan (explode) komponen BOM paket secara otomatis ke dalam baris-baris rincian item Change Order lengkap dengan klasifikasi MATERIAL atau LABOR, kuantitas, harga modal HPP, harga jual satuan, serta penentuan target alokasi tahapan WBS (Single WBS Target atau Multi-WBS auto-distribution).

## Scope

### Included
- **Komponen Modal Pemilih Paket (`src/components/ChangeOrderPackageModal.tsx`) & Utility (`src/utils/packageExplosion.ts`)**:
  - Utility `explodePackageToDraftItems` dan `mapToWbsStage` untuk memproses ledakan BOM paket assembly secara deterministik.
  - Modal interaktif untuk memilih paket barang jadi dari `product_packages` (menggunakan `packageService.getPackages()`).
  - Menampilkan ringkasan paket: nama paket, harga jual paket, dan daftar komponen BOM (material, jasa/labor, overhead beserta kuantitas, satuan, dan HPP).
  - Pilihan konfigurasi alokasi WBS:
    - **Single WBS Target**: Pengguna memilih satu tahapan WBS target untuk semua komponen paket.
    - **Multi-WBS (Distribusi Otomatis)**: Mendistribusikan kuota komponen secara otomatis ke tahapan WBS berdasarkan `default_wbs_allocation` template paket (atau fallback ke target WBS default jika kosong).
  - Pengali kuantitas paket (Package Quantity Multiplier, default 1).
  - Kalkulasi harga satuan jual (`unit_price`) dan modal HPP (`cost_price`) komponen secara presisi menjaga rasio margin paket.
  - Aksi "Terapkan Paket ke Change Order" yang menghasilkan baris-baris `DraftItem[]` dan menutup modal.
- **Integrasi Toolbar & State di Formulir Change Order (`src/components/AmendmentManager.tsx`)**:
  - Menambahkan tombol aksi `+ Paket Barang Jadi` di toolbar formulir berdampingan dengan `+ Item Overhead (FOH)`:
    ```tsx
    <button
      type="button"
      onClick={() => setIsPackageSelectorOpen(true)}
      className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
    >
      <span>📦</span>
      <span>+ Paket Barang Jadi</span>
    </button>
    ```
  - State `isPackageSelectorOpen` untuk mengontrol pembukaan modal.
  - Handler `handleApplyPackage` untuk menyisipkan item-item hasil ledakan paket ke dalam state `draftItems`.
  - Menjaga reaktivitas perhitungan total jual, HPP modal, margin profit, dan validasi submit form.
- **Testing & Empirical Validation**:
  - Unit tests di `src/utils/__tests__/packageExplosion.test.ts` (8/8 tests passing).
  - Component tests di `src/components/__tests__/ChangeOrderPackageModal.test.tsx` (8/8 tests passing).
  - Integration tests di `src/components/__tests__/AmendmentManager.test.tsx` (6/6 tests passing).
  - Validasi penuh terhadap seluruh test suite Vitest (42 test suites, 284 tests passing), Oxlint (0 warning/error), validasi tipe TypeScript (`tsc -b`), dan Vite production build.

### Explicitly Excluded
- Mengubah alur persetujuan Kasir / Owner untuk Change Order.
- Mengubah skema tabel database `product_packages` atau `package_items`.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Create `ChangeOrderPackageModal.tsx` Component & `packageExplosion.ts` Utility | Antigravity | ✅ Done | 0.8h |
| 2. Integrate Button & Modal into `AmendmentManager.tsx` | Antigravity | ✅ Done | 0.5h |
| 3. Add Comprehensive Tests for Package Selection & BOM Explosion | Antigravity | ✅ Done | 0.6h |
| 4. Empirical Validation (Vitest, Oxlint, TypeScript build) | Antigravity | ✅ Done | 0.3h |

## Daily Log

### 2026-10-21
- Sprint 64 archived to `.gsd/sprints/sprint-64-add-completion-deadline-to-spk-borongan-assignment-form-and-official-work-order-print-view.md`.
- Sprint 65 created for enabling addition of product packages (assembly lists) in Change Order form.
- Task 1: Implemented `src/utils/packageExplosion.ts` with `explodePackageToDraftItems` and `mapToWbsStage`, handling Single WBS Target, Multi-WBS auto-distribution based on `default_wbs_allocation`, proportional margin pricing, and multiplier scaling. Implemented `src/components/ChangeOrderPackageModal.tsx` with modal dialog, live BOM table preview, WBS mode switchers, package quantity input, and financial summary cards.
- Task 2: Integrated `+ Paket Barang Jadi` button in `src/components/AmendmentManager.tsx` next to `+ Item Overhead (FOH)`. Added `isPackageSelectorOpen` state, `handleApplyPackage` append handler, and rendered `<ChangeOrderPackageModal />`.
- Task 3: Added unit tests in `src/utils/__tests__/packageExplosion.test.ts` (8 tests), component tests in `src/components/__tests__/ChangeOrderPackageModal.test.tsx` (8 tests), and updated integration tests in `src/components/__tests__/AmendmentManager.test.tsx` (6 tests).
- Task 4: Verified 100% test coverage across 42 test suites (284 tests passing), 0 warnings/errors in Oxlint across 169 files, clean TypeScript `tsc -b` compilation, and clean Vite production build in 503ms.

## Retrospective (end of sprint)

### What Went Well
- Separating the calculation and mapping logic into `src/utils/packageExplosion.ts` allowed isolated unit testing of edge cases without DOM overhead, while keeping `ChangeOrderPackageModal.tsx` strictly focused on presentation and interaction.
- The proportional margin calculation guarantees that the sum of selling prices of exploded items matches the package quotation price while maintaining realistic line-item profit margins.
- Clean backward compatibility: Service Advisors can still add individual materials, labor, and overhead items, or explode assembly packages and further customize quantities/prices before submitting.

### What Could Improve
- Future enhancements could allow saving custom package allocations back as default package templates directly from the Change Order modal if needed.

### Action Items
- None; fully complete, empirically verified, and production-ready.

---

*Last updated: 2026-10-21*
