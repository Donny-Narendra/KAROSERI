---
phase: 40
plan: refactor-rab-remove-labor
wave: 4
gap_closure: true
---

# Fix: Penyatuan Input Tenaga Kerja ke Dalam Pencarian Material RAB

## Problem
Form Add Estimation Item pada `RabCalculator.tsx` memisahkan input "Material" dan "Labor". Namun, operasional lapangan telah mendata jenis pekerjaan (jasa tukang las, tukang dempul, dll) ke dalam tabel `materials`. Hal ini menimbulkan kebingungan bagi estimator dan redundansi pada skema data, di mana jasa tenaga kerja tidak bisa dipilih melalui dropdown material padahal datanya ada di master material.

## Root Cause
Terdapat opsi eksplisit berupa radio button `Labor` yang tidak terhubung dengan tabel `materials`. Ketika dipilih, pengguna mengisi field `labor_rate` dan `labor_hours` secara manual tanpa standardisasi harga dari database, berpotensi menimbulkan *costing leak*.

## Tasks

<task type="auto">
  <name>Hapus Opsi Labor dan Satukan Input RAB</name>
  <files>src/components/RabCalculator.tsx</files>
  <action>
    1. Cari dan hapus opsi input radio "Labor" dari state/UI tipe item estimasi di komponen `RabCalculator.tsx`.
    2. Pertahankan `Material` sebagai tipe bawaan dan opsi tambahan (misal `Overhead`) jika masih ada.
    3. Pastikan komponen `MaterialAutocomplete` tidak memfilter keluar item bertipe jasa, sehingga semua item master terambil. (Asumsinya `MaterialAutocomplete` sudah query `materials` tanpa hardcode filter khusus. Jika ada, hapus batasan tersebut.)
    4. Sesuaikan fungsi `handleAddManualItem` (handler insert item manual) agar input tenaga kerja di-handle persis seperti material biasa, menggunakan `material_id` yang terpilih, `unit_price`, dan `quantity`. Set `labor_hours` atau field lain terkait labor ke null/0 jika masih mandatory, atau hilangkan pengisiannya.
    5. Verifikasi bahwa `calculateTotalCost` (total estimasi) tetap akurat dalam menjumlahkan *subtotal* material dan labor yang sekarang tersentralisasi di kolom material.
  </action>
  <verify>
    Skenario pengujian:
    - Buka form Add Estimation Item di RAB Calculator.
    - Opsi radio "Labor" sudah tidak ada.
    - Ketik jenis jasa di input autocomplete (misal: Tukang Cat) -> item muncul -> pilih.
    - Isi jumlah jam/hari di field `Quantity` -> tekan "Add Item".
    - Item masuk ke dalam tabel ringkasan RAB dan total RAB terupdate.
    - Build aplikasi (`npm run build`) dan linting (`npx oxlint`) berjalan sukses tanpa galat tipe.
  </verify>
  <done>
    Semua item (baik bahan mentah maupun jasa) diinput melalui mekanisme pencarian material yang seragam tanpa adanya opsi Labor terpisah.
  </done>
</task>
