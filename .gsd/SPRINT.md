# Sprint 65 — Enable Adding Product Packages (Assembly Lists) in Change Order Form

> **Duration**: 2026-10-21 to 2026-10-21
> **Status**: In Progress

## Goal
Menambahkan tombol aksi `+ Paket Barang Jadi (Assembly List)` di toolbar formulir Change Order, membuka modal pemilihan paket assembly dari master `product_packages`, dan meledakkan (explode) komponen BOM paket secara otomatis ke dalam baris-baris rincian item Change Order lengkap dengan klasifikasi MATERIAL atau LABOR, kuantitas, harga modal HPP, harga jual satuan, serta penentuan target alokasi tahapan WBS (Single WBS Target atau Multi-WBS auto-distribution).

## Scope

### Included
- **Komponen Modal Pemilih Paket (`src/components/ChangeOrderPackageModal.tsx`)**:
  - Modal interaktif untuk memilih paket barang jadi dari `product_packages` (menggunakan `packageService.getPackages()`).
  - Menampilkan ringkasan paket: nama paket, harga jual paket, dan daftar komponen BOM (material, jasa/labor, overhead beserta kuantitas, satuan, dan HPP).
  - Pilihan konfigurasi alokasi WBS:
    - **Single WBS Target**: Pengguna memilih satu tahapan WBS target untuk semua komponen paket.
    - **Multi-WBS (Distribusi Otomatis)**: Mendistribusikan kuota komponen secara otomatis ke tahapan WBS berdasarkan `default_wbs_allocation` template paket (atau fallback ke target WBS default jika kosong).
  - Pengali kuantitas paket (Package Quantity Multiplier, default 1).
  - Kalkulasi harga satuan jual (`unit_price`) dan modal HPP (`cost_price`) komponen secara presisi.
  - Aksi "Terapkan Paket ke Change Order" yang menghasilkan baris-baris `DraftItem[]` dan menutup modal.
- **Integrasi Toolbar & State di Formulir Change Order (`src/components/AmendmentManager.tsx`)**:
  - Menambahkan tombol aksi `+ Paket Barang Jadi` di toolbar formulir berdampingan dengan `+ Item Overhead (FOH)`.
  - State `isPackageSelectorOpen` untuk mengontrol pembukaan modal.
  - Handler `handleApplyPackage` untuk menyisipkan item-item hasil ledakan paket ke dalam state `draftItems`.
  - Menjaga reaktivitas perhitungan total jual, HPP modal, margin profit, dan validasi submit form.
- **Testing & Empirical Validation**:
  - Unit tests di `src/components/__tests__/ChangeOrderPackageModal.test.tsx`.
  - Integration tests di `src/components/__tests__/AmendmentManager.test.tsx`.
  - Validasi penuh terhadap seluruh test suite Vitest, Oxlint (0 warning/error), validasi tipe TypeScript (`tsc -b`), dan Vite production build.

### Explicitly Excluded
- Mengubah alur persetujuan Kasir / Owner untuk Change Order.
- Mengubah skema tabel database `product_packages` atau `package_items`.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Create `ChangeOrderPackageModal.tsx` Component | Antigravity | ⏳ In Progress | 0.8h |
| 2. Integrate Button & Modal into `AmendmentManager.tsx` | Antigravity | ⬜ Todo | 0.5h |
| 3. Add Comprehensive Tests for Package Selection & BOM Explosion | Antigravity | ⬜ Todo | 0.6h |
| 4. Empirical Validation (Vitest, Oxlint, TypeScript build) | Antigravity | ⬜ Todo | 0.3h |

## Daily Log

### 2026-10-21
- Sprint 64 archived to `.gsd/sprints/sprint-64-add-completion-deadline-to-spk-borongan-assignment-form-and-official-work-order-print-view.md`.
- Sprint 65 created for enabling addition of product packages (assembly lists) in Change Order form.
