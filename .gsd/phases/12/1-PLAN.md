---
phase: 12
plan: 1
wave: 1
depends_on: []
files_modified:
  - src/utils/excelExport.ts
  - src/components/InventoryManager.tsx
  - src/components/ImportInventoryModal.tsx
autonomous: true

must_haves:
  truths:
    - "File Excel terunduh dengan header yang memuat nama kolom database materials pada baris 2"
    - "Uji coba upload file Excel tersebut berhasil dipetakan ke kolom database tanpa error"
  artifacts:
    - "src/utils/excelExport.ts"
    - "src/components/ImportInventoryModal.tsx"
---

# Plan 12.1: Penyelarasan Nama Kolom Database pada Download Template Excel Material Inventaris

<objective>
Menambahkan dua baris header pada file Excel material (baris pertama untuk label ramah pengguna, baris kedua untuk field nama kolom DB sesungguhnya) dan menyesuaikan parser impor agar lebih fleksibel saat membaca file ini maupun file versi lawas.
</objective>

<context>
Load for context:
- src/utils/excelExport.ts
- src/components/InventoryManager.tsx
- src/components/ImportInventoryModal.tsx
</context>

<tasks>

<task type="auto">
  <name>Sertakan nama kolom database tabel materials pada template download Excel dan dukung parser impor</name>
  <files>src/utils/excelExport.ts, src/components/InventoryManager.tsx, src/components/ImportInventoryModal.tsx</files>
  <action>
    1. Di fungsi export Excel (`excelExport.ts` / `InventoryManager.tsx`):
       - Susun header spreadsheet Excel dengan dua baris header yang jelas:
         * Baris 1 (Label): ID Material | Nama Bahan | Satuan (Unit) | Stok Saat Ini | Stok Minimum | Harga Satuan (Rp) | Waste Factor (%)
         * Baris 2 (DB Key): id | name | unit | current_stock | minimum_stock | unit_price | waste_factor_percentage
       - Jika tabel `materials` sudah berisi data, sertakan seluruh baris data di bawah baris header tersebut. Jika tabel masih kosong, sertakan 1 baris contoh pengisian.
       - Terapkan auto-width pada kolom sheet agar teks nama kolom tidak terpotong.
    2. Di parser impor (`ImportInventoryModal.tsx`):
       - Perbarui pembacaan baris Excel: sesuaikan logika mapping agar dapat mengenali nama field database (`name`, `current_stock`, `unit_price`, dll.) maupun nama header label alternatif (case-insensitive).
       - Abaikan baris ke-2 jika terdeteksi berisi nama kunci database.
  </action>
  <verify>Jalankan oxlint / npm run build, klik tombol Download di /warehouse, buka file Excel yang terunduh, pastikan nama kolom database (id, name, unit, current_stock, dll.) tercantum jelas di file Excel.</verify>
  <done>File template Excel menampilkan nama kolom database dan siap diisi untuk impor massal.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] File Excel terunduh dengan header yang memuat nama kolom database `materials`.
- [ ] Uji coba upload file Excel tersebut berhasil dipetakan ke kolom database tanpa error.
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>
