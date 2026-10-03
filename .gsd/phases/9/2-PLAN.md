---
phase: 9
plan: 2
wave: 2
depends_on: [1]
files_modified:
  - src/components/InventoryManager.tsx
  - src/utils/excelExport.ts
autonomous: true

must_haves:
  truths:
    - "Data master material dapat diunduh ke format Excel (.xlsx)"
  artifacts:
    - "src/utils/excelExport.ts"
---

# Plan 9.2: Ekspor Data Stok ke File Excel (.xlsx)

<objective>
Implementasi fitur download/export seluruh data materials ke file XLSX agar petugas gudang dapat melihat dan memodifikasinya di luar sistem untuk re-import nantinya.
</objective>

<context>
Load for context:
- src/components/InventoryManager.tsx
</context>

<tasks>

<task type="auto">
  <name>Implementasi fitur download/export seluruh data materials ke XLSX</name>
  <files>src/components/InventoryManager.tsx, src/utils/excelExport.ts</files>
  <action>
    1. Pasang/gunakan library `xlsx` (SheetJS) untuk formatting worksheet.
    2. Tambahkan tombol "Download Data Stok (Excel)" pada header tabel inventaris di `InventoryManager.tsx`.
    3. Buat utilitas `excelExport.ts` yang fungsi exportnya mengambil seluruh record dari tabel `materials` dan memetakannya ke kolom header Excel yang ramah pengguna:
       - Kolom A: `ID Material` (Read-only reference)
       - Kolom B: `Nama Barang` (Wajib diisi)
       - Kolom C: `Satuan` (lembar/batang/kaleng/set/dll)
       - Kolom D: `Stok Saat Ini` (Nilai numerik yang dapat diedit petugas gudang)
       - Kolom E: `Stok Minimum` (Peringatan restock)
       - Kolom F: `Harga Satuan (Rp)`
       - Kolom G: `Waste Factor (%)`
    4. Trigger download file dengan nama dinamis: `Inventaris_Karoseri_YYYYMMDD.xlsx`.
  </action>
  <verify>Klik tombol Download Data Stok, periksa file Excel yang terunduh dan pastikan header serta data tabel materials terpetakan rapi.</verify>
  <done>Petugas gudang dapat mengunduh seluruh data master material ke file spreadsheet Excel.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] Tombol Download Data Stok berfungsi dengan baik.
- [ ] Format file Excel benar dan tidak corrupt.
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>
