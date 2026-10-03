---
phase: 9
plan: 1
wave: 1
depends_on: []
files_modified:
  - src/pages/WarehouseDashboard.tsx
  - src/components/InventoryManager.tsx
  - src/services/inventoryService.ts
autonomous: true

must_haves:
  truths:
    - "Gudang dapat melihat dan mengelola inventaris material (CRUD) secara manual"
  artifacts:
    - "src/components/InventoryManager.tsx"
---

# Plan 9.1: Antarmuka CRUD Manual Inventaris Gudang

<objective>
Menambahkan sub-tab baru di Dashboard Gudang untuk Manajemen Inventaris dan mengimplementasikan fungsi CRUD manual material.
</objective>

<context>
Load for context:
- src/pages/WarehouseDashboard.tsx
- src/services/inventoryService.ts
</context>

<tasks>

<task type="auto">
  <name>Buat komponen tabel manajemen inventaris dan modal CRUD di Warehouse</name>
  <files>src/pages/WarehouseDashboard.tsx, src/components/InventoryManager.tsx, src/services/inventoryService.ts</files>
  <action>
    1. Tambahkan sub-tab baru di Dashboard Gudang: "Manajemen Inventaris" (berdampingan dengan Issue Material, Return Material, Mandor Requests).
    2. Buat komponen `InventoryManager.tsx` yang menampilkan tabel material:
       - Kolom: Nama Bahan, Satuan (Unit), Stok Saat Ini, Stok Minimum, Harga Satuan, Waste Factor %, Aksi (Edit, Hapus).
    3. Buat modal dialog "Tambah Material Baru" dan "Edit Material":
       - Input fields: Nama, Satuan (pcs/lembar/batang/kaleng/tube/dll), Stok Awal, Stok Minimum, Harga Satuan, Waste Factor %.
    4. Implementasikan aksi Hapus manual dengan dialog konfirmasi peringatan (Soft-guard: cek apakah material pernah digunakan di `inventory_transactions` sebelum menghapus).
    5. Sambungkan fungsi ke Supabase API: `insert`, `update`, dan `delete` pada tabel `materials`.
  </action>
  <verify>Jalankan oxlint / npm run build, buka tab Manajemen Inventaris di /warehouse, coba tambahkan 1 material manual dan pastikan tersimpan ke Supabase.</verify>
  <done>Petugas gudang dapat melihat daftar stok dan mengelola item material secara manual.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] CRUD berjalan sempurna tanpa error di console.
- [ ] Komponen Manajemen Inventaris muncul di Warehouse Dashboard.
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>
