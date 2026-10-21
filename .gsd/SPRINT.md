# Sprint 62 — Add Autocomplete Search for Labor Items from Materials Inventory in Change Order Form

> **Duration**: 2026-10-21 to 2026-10-21
> **Status**: Completed

## Goal
Mengintegrasikan komponen pencarian autocomplete real-time berbasis master inventaris jasa (`materials`) pada input "Uraian Jasa / Pekerjaan" di formulir Change Order (`AmendmentManager.tsx`), mendukung navigasi keyboard (ArrowUp, ArrowDown, Enter, Escape), auto-populate tarif jual dan modal HPP gudang, serta fallback fleksibel untuk nama kustom non-inventaris dengan snapshot `material_id`.

## Scope

### Included
- **Filter Master Jasa (`laborMaterials`) di `AmendmentManager.tsx`**:
  - Filter `masterMaterials` untuk menyajikan item kategori/nama labor/jasa:
    `category.includes('labor') || category.includes('jasa') || name.startsWith('tukang') || name.includes('jasa') || isLaborKeyword(...)`.
- **Komponen Autocomplete Pencarian Jasa (`LaborSearchAutocomplete.tsx`)**:
  - Floating suggestions dropdown saat pengguna mengetik.
  - Menampilkan nama pekerjaan jasa, tarif standar jual (`Rp {unit_price}`), dan HPP modal (`HPP: Rp {cost_price}`).
  - Navigasi keyboard:
    - `ArrowDown` & `ArrowUp` untuk memindahkan highlight saran.
    - `Enter` untuk mengunci item inventaris terpilih dan auto-populate `unit_price` dan `cost_price` (`selected.cost_price || selected.unit_price * 0.8`), atau menetapkan nama kustom bebas (`material_id = null`).
    - `Escape` untuk menutup dropdown.
  - Fallback nama kustom non-inventaris:
    - Jika input tidak cocok atau user menekan Enter pada teks bebas, tetapkan teks sebagai nama kustom, set `material_id = null`, dan biarkan field HPP serta Harga Jual tetap dapat diedit manual.
- **Integrasi di `AmendmentManager.tsx`**:
  - Ganti text input biasa pada baris item `item_type === 'LABOR'` dengan `LaborSearchAutocomplete`.
  - Pasang callback pembaruan item untuk auto-populate `unit_price`, `cost_price`, `material_id`, dan `unit`.
  - Pastikan pengajuan Change Order (`handleSubmit`) menyertakan `material_id` (atau null), `item_name`, `item_type = 'LABOR'`, `wbs_stage`, `quantity`, `unit_price`, dan `cost_price`.
- **Testing & Empirical Validation**:
  - Tambahkan unit & component tests komprehensif di `AmendmentManager.test.tsx` dan `LaborSearchAutocomplete.test.tsx`:
    1. Pencarian dan pemilihan item jasa dari inventaris via keyboard / klik auto-populate harga jual dan HPP modal.
    2. Input nama kustom non-inventaris dengan Enter menghasilkan `material_id = null` dan memungkinkan edit manual harga.
    3. Payload pengajuan `createChangeOrder` menyertakan `material_id` untuk master labor dan `null` untuk custom labor.
  - Verifikasi seluruh test suite Vitest (39 test suites, 257 tests passing), linter Oxlint (0 warnings), dan build Vite/TypeScript.

### Explicitly Excluded
- Mengubah alur pengeluaran fisik barang gudang (`material_issues`).
- Mengubah skema database (kolom `material_id` sudah ada di `change_order_items`).

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Create `LaborSearchAutocomplete.tsx` Component | Antigravity | ✅ Done | 0.3h |
| 2. Integrate Labor Autocomplete & Filter in `AmendmentManager.tsx` | Antigravity | ✅ Done | 0.3h |
| 3. Update & Expand Component Tests in `AmendmentManager.test.tsx` | Antigravity | ✅ Done | 0.3h |
| 4. Empirical Validation (Vitest test suite, Oxlint 0 warnings, TypeScript build) | Antigravity | ✅ Done | 0.2h |

## Daily Log

### 2026-10-21
- Sprint 62 initialized.
- Analyzed `AmendmentManager.tsx`, `RabCalculator.tsx`, `MaterialSearchAutocomplete.tsx`, and `spkService.ts`.
- Task 1: Created `src/components/LaborSearchAutocomplete.tsx` with real-time filtering from `laborMaterials`, keyboard navigation (`ArrowDown`, `ArrowUp`, `Enter`, `Escape`), auto-scroll active option, popup suggestions showing job name, standard selling rate, and HPP modal price, status badge indicator (`Master`, `Kustom`, or `Katalog`), and fallback for custom non-inventory labor.
- Task 2: Integrated `LaborSearchAutocomplete` into `src/components/AmendmentManager.tsx`:
  - Added `laborMaterials` useMemo filtering `masterMaterials` via `isLaborKeyword` and category/name patterns.
  - Added `handleSelectLaborItem` callback to auto-populate `material_id`, `item_name`, `unit_price`, `cost_price`, and `unit`.
  - Added `handleCustomLaborName` callback setting `material_id: null` while preserving custom text.
  - Replaced plain text input on `item_type === 'LABOR'` rows with `LaborSearchAutocomplete`.
  - Ensured `createChangeOrder` in `handleSubmit` explicitly transmits `material_id: item.material_id || null`.
- Task 3: Created `src/components/__tests__/LaborSearchAutocomplete.test.tsx` (7 unit tests covering rendering, search filter, price/HPP preview, keyboard navigation, mouse click selection, freeform fallback, badge indicator, and Escape dismissal).
- Task 4: Expanded `src/components/__tests__/AmendmentManager.test.tsx`:
  - Added mock labor materials into `inventoryService.getMaterials`.
  - Added Verification 1 test: autosearch and selection of labor item ("TUKANG LAS STRUKTUR SASIS") auto-populates `unit_price: 150000`, `cost_price: 120000`, and passes `material_id: 'mat-labor-1'`.
  - Added Verification 2 test: custom non-inventory labor name ("jasa borong bongkar tangki darurat") via Enter sets `material_id: null`, allows manual price entry (`unit_price: 250000`, `cost_price: 150000`), and submits payload.
- Empirical Validation:
  - Vitest: 39/39 test suites passing, 257/257 tests passing (100%).
  - Oxlint: 0 errors, 0 warnings across 164 files.
  - TypeScript static analysis: clean compilation with `tsc -b`.
  - Production build: clean Vite build bundled in 492ms.
