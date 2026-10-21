# Sprint 61 — Support Cost Price and Selling Price Input for Custom Non-Inventory Labor in RabCalculator

> **Duration**: 2026-10-21 to 2026-10-21
> **Status**: Completed

## Goal
Menyediakan input terpisah antara Biaya Modal/Upah Tukang (`cost_price` / HPP) dan Tarif Tagih ke Konsumen (`unit_price` / harga jual) untuk pekerjaan jasa/tukang kustom non-inventaris pada `RabCalculator.tsx` di `/service-advisor`, menyimpan kedua nilai ke `rab_items` dengan `material_id = null`, serta menampilkan indikator proyeksi margin jasa secara real-time.

## Scope

### Included
- **UI Form Refactoring di `RabCalculator.tsx`**:
  - Deklarasikan state lokal: `selectedLaborMaterialId: string | null`, `isCustomLabor: boolean`, `laborCostPrice: number`, `laborUnitPrice: number`.
  - Integrasikan handler pemilihan item master inventaris jasa:
    - `selectedLaborMaterialId = material.id`
    - `isCustomLabor = false`
    - `laborCostPrice = material.cost_price || Math.round(material.unit_price * 0.8)`
    - `laborUnitPrice = material.unit_price`
  - Integrasikan handler nama kustom (non-inventory):
    - `selectedLaborMaterialId = null`
    - `isCustomLabor = true`
    - Keduanya terbuka untuk input manual oleh Service Advisor.
  - Render form finansial ganda (2 kolom responsif):
    - Field 1: `Upah Pokok Tukang / Biaya Modal (HPP) *` (`laborCostPrice`)
    - Field 2: `Tarif Tagih ke Konsumen (Harga Jual) *` (`laborUnitPrice`)
  - Render Live Margin Indicator:
    - Menampilkan selisih nominal margin (Rp) dan persentase (%) secara real-time sebelum item ditambahkan.
  - Alur submit `handleAddLaborItem`:
    - Simpan item dengan `costPrice: laborCostPrice`, `unitPrice: laborUnitPrice`, `subtotal: wbsQty * laborUnitPrice`, `materialId: isCustomLabor ? undefined : (selectedLaborMaterialId || undefined)`.
    - Mutasi Supabase `insertRabItems` mengirimkan `cost_price` dan `unit_price` yang terpisah secara presisi.
  - Alur edit `handleEditItem` & cancel `handleCancelEdit`:
    - Mengisi `laborCostPrice = item.costPrice || item.unitPrice` dan `laborUnitPrice = item.unitPrice`.
    - Mereset state saat dibatalkan atau selesai disimpan.
- **Testing & Empirical Validation**:
  - Selaraskan `RabCalculatorLabor.test.tsx` dan `RabCalculatorDecimal.test.tsx` agar selaras dengan input finansial ganda.
  - Tambahkan unit test spesifik yang memvalidasi:
    1. Input tukang kustom memunculkan field Biaya Modal dan Tarif Jual.
    2. Perhitungan proyeksi margin real-time (Rp dan %).
    3. Payload penyimpanan `cost_price` dan `unit_price` berbeda secara presisi ke `rab_items`.
    4. Auto-population dari master inventaris jasa.
    5. Edit item jasa kustom dengan pre-fill `laborCostPrice` dan `laborUnitPrice`.
  - Verifikasi seluruh rangkaian Vitest (38 test suites), linter Oxlint (0 warnings), dan build TypeScript/Vite.

### Explicitly Excluded
- Mengubah alur pengeluaran bahan baku fisik di gudang (`material_issues`).
- Mengubah skema database `rab_items` (karena kolom `cost_price` dan `unit_price` sudah ada).

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Refactor State & Logic for Labor Pricing in `RabCalculator.tsx` | Antigravity | ✅ Done | 0.3h |
| 2. Render Responsive Dual Input Fields & Live Margin Indicator in `RabCalculator.tsx` | Antigravity | ✅ Done | 0.3h |
| 3. Align `handleAddLaborItem`, `handleEditItem`, & Form Reset in `RabCalculator.tsx` | Antigravity | ✅ Done | 0.3h |
| 4. Update Existing Tests in `RabCalculatorLabor.test.tsx` & `RabCalculatorDecimal.test.tsx` | Antigravity | ✅ Done | 0.4h |
| 5. Add Dedicated Unit Tests for Custom Labor Dual Pricing in `RabCalculatorLabor.test.tsx` | Antigravity | ✅ Done | 0.3h |
| 6. Empirical Validation (Vitest 38/38, Oxlint 0 warnings, TypeScript build) | Antigravity | ✅ Done | 0.2h |

## Daily Log

### 2026-10-21
- Sprint 61 initialized.
- Task 1: Refactored state in `src/components/RabCalculator.tsx`: added `selectedLaborMaterialId`, `isCustomLabor`, `laborCostPrice`, `laborUnitPrice`. Updated autocomplete click and keyboard Enter handler to detect master inventory vs custom non-inventory items.
- Task 2: Replaced single "ESTIMASI BIAYA JASA / UPAH" input with responsive dual inputs: Field 1 "Upah Pokok Tukang / Biaya Modal (HPP)" and Field 2 "Tarif Tagih ke Konsumen (Harga Jual)". Added dynamic Live Margin Indicator showing projected margin in Rp and % in real-time. Added visual badge "KUSTOM (NON-INVENTARIS)" and "MASTER INVENTARIS" in section header.
- Task 3: Aligned `handleAddLaborItem` to push and persist distinct `costPrice` and `unitPrice` with `materialId: isCustomLabor ? undefined : selectedLaborMaterialId`. Aligned `handleEditItem` to prefill `laborCostPrice` and `laborUnitPrice` and determine `isCustomLabor` from `!item.materialId`. Updated `handleCancelEdit` and form reset.
- Task 4: Updated existing tests in `src/components/__tests__/RabCalculatorDecimal.test.tsx` and `src/components/__tests__/RabCalculatorLabor.test.tsx` to match new input labels and placeholders.
- Task 5: Added dedicated unit tests in `src/components/__tests__/RabCalculatorLabor.test.tsx`:
  - Verified custom labor input activates `KUSTOM (NON-INVENTARIS)` badge, dual inputs, and real-time margin preview.
  - Verified payload insertion with distinct `cost_price`, `unit_price`, and `material_id = null`.
  - Verified edit mode pre-fills custom labor `cost_price` and `unit_price` with live margin.
- Task 6: Completed empirical validation:
  - Vitest: 38/38 test suites passing, 245/245 tests passing (100%).
  - Oxlint: 0 errors, 0 warnings across 162 files.
  - TypeScript static analysis: clean compilation with `npx tsc -b`.
  - Production bundle: clean Vite build in 431ms.
