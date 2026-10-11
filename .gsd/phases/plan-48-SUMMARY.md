---
phase: 48
plan: fix-spk-borongan-rab-subtotal-column
completed_at: 2026-10-11T17:25:00+07:00
duration_minutes: 6
---

# Summary: Menampilkan Kolom Subtotal RAB pada Panel "Panduan Material (RAB)" di Modal SPK Borongan

## Results
- 3 tasks completed
- All verifications passed

## Tasks Completed
| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | Penyesuaian Query dan Data Mapping pada SpkBoronganPanel.tsx | 30fefdf | ✅ |
| 2 | Penambahan Kolom Subtotal RAB pada Tabel Panduan Material | 30fefdf | ✅ |
| 3 | Verifikasi, Type Checking, dan Build Validation | 30fefdf | ✅ |

## Deviations Applied
- None. Implementasi sesuai dengan rancangan spesifikasi dan data model yang ada.

## Files Changed
- `src/components/SpkBoronganPanel.tsx`:
  - Interface `RabMaterial` ditambahkan properti `item_total?: number;`, `unit_price?: number;`, dan `materials.unit_price?: number;`.
  - Fungsi helper `formatCurrency` menggunakan `new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })` dengan fallback `Rp 0`.
  - Query `fetchRabMaterials` disesuaikan untuk mengambil `item_total` dan `materials.unit_price`.
  - Header tabel ditambahkan kolom ke-3 `Subtotal RAB` rata kanan (`text-right w-36 whitespace-nowrap`).
  - Baris tabel merender nilai subtotal terhitung `(item.item_total || item.quantity * unit_price)` dalam format Rupiah Indonesia, serta kolom Nama Material diproteksi dengan `break-words min-w-0` agar tidak merusak lebar kolom Qty dan Subtotal.

## Verification
- Query Data Mapping: ✅ Passed (Pengambilan `item_total` dan `materials.unit_price` dari Supabase)
- Kalkulasi Subtotal: ✅ Passed (Data WBS 1 'TUKANG LAS DUDUKAN SLEBOR' dengan Qty 0.2 menghasilkan subtotal 16.000)
- Tampilan Format Rupiah: ✅ Passed (Format `Rp 16.000` dengan fallback `Rp 0` saat 0/null)
- Layout Responsif: ✅ Passed (3 kolom Nama Material | Qty | Subtotal RAB rapi tanpa tabrakan lebar)
- TypeScript & Linter Check: ✅ Passed (`npx oxlint` 0 error)
- Vite Production Build: ✅ Passed (`npm run build` sukses 0 error)
