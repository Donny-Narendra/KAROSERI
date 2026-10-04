---
phase: 10
plan: 1
wave: 1
depends_on: []
files_modified:
  - src/components/InventoryManager.tsx
  - src/services/inventoryService.ts
autonomous: true

must_haves:
  truths:
    - "Gudang dapat memilih beberapa material sekaligus dan menghapusnya"
    - "Material yang sudah digunakan dalam transaksi SPK tidak dapat dihapus"
  artifacts:
    - "src/components/InventoryManager.tsx"
---

# Plan 10.1: Antarmuka Seleksi Checklist dan Hapus Bersama (Bulk Delete) Inventaris

<objective>
Menambahkan fitur seleksi massal pada tabel inventaris gudang beserta fungsi Bulk Delete dengan proteksi Foreign Key.
</objective>

<context>
Load for context:
- src/components/InventoryManager.tsx
- src/services/inventoryService.ts
</context>

<tasks>

<task type="auto">
  <name>Tambahkan checkbox seleksi dan tombol bulk delete pada InventoryManager</name>
  <files>src/components/InventoryManager.tsx, src/services/inventoryService.ts</files>
  <action>
    1. Di komponen `InventoryManager.tsx`:
       - Tambahkan state `selectedMaterialIds: string[]`.
       - Pada tabel inventaris, tambahkan kolom `<th>` paling kiri berisi checkbox "Select All" (toggle select all vs deselect all).
       - Pada setiap baris `<tr>`, tambahkan `<td>` paling kiri berisi `<input type="checkbox" checked={selectedMaterialIds.includes(item.id)} onChange={...} />`.
    2. Tambahkan tombol bar di atas tabel:
       - Tombol "Hapus Terpilih ({selectedMaterialIds.length})" dengan warna merah/danger, disabled jika `selectedMaterialIds.length === 0`.
    3. Buat modal dialog konfirmasi:
       - Tampilkan daftar nama barang yang akan dihapus dan peringatan aksi tidak dapat dibatalkan.
    4. Di `inventoryService.ts`, implementasikan fungsi `bulkDeleteMaterials(ids: string[])`:
       - Jalankan query verifikasi dependensi FK (atau handle error PostgreSQL FK constraint 23503 secara ramah pengguna).
       - Jalankan mutasi: `supabase.from('materials').delete().in('id', ids)`.
       - Kembalikan status keberhasilan ke UI.
  </action>
  <verify>Jalankan oxlint / npm run build, buka tab Manajemen Inventaris di /warehouse, centang beberapa material uji coba, klik Hapus Terpilih, konfirmasi modal, dan pastikan baris terhapus dari tabel dan database.</verify>
  <done>Petugas gudang dapat menandai beberapa material melalui checkbox dan menghapusnya secara bersamaan.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] Checkbox tampil rapi di kolom paling kiri header dan isi tabel.
- [ ] Checkbox "Select All" berfungsi mencentang dan mengosongkan semua pilihan.
- [ ] Tombol "Hapus Terpilih" mengeksekusi penghapusan massal ke Supabase dan memperbarui antarmuka secara instan.
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>
