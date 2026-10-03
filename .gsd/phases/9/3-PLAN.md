---
phase: 9
plan: 3
wave: 3
depends_on: [2]
files_modified:
  - src/components/InventoryManager.tsx
  - src/components/ImportInventoryModal.tsx
  - src/services/inventoryService.ts
autonomous: true

must_haves:
  truths:
    - "Data master material dapat diimpor massal via Excel dengan rekonsiliasi stok"
  artifacts:
    - "src/components/ImportInventoryModal.tsx"
---

# Plan 9.3: Smart Bulk Import & Auto Reconciliation dari File Excel

<objective>
Implementasi smart import XLSX dengan logika skip, update, dan insert baru agar pembaruan data secara massal menjadi mudah tanpa resiko kehilangan data.
</objective>

<context>
Load for context:
- src/components/InventoryManager.tsx
- src/services/inventoryService.ts
</context>

<tasks>

<task type="auto">
  <name>Implementasi smart import XLSX dengan logika skip, update, dan insert baru</name>
  <files>src/components/InventoryManager.tsx, src/components/ImportInventoryModal.tsx, src/services/inventoryService.ts</files>
  <action>
    1. Buat tombol "Import Excel (.xlsx)" dan modal file uploader `ImportInventoryModal.tsx` yang menerima file `.xlsx` / `.xls`.
    2. Baca data baris Excel menggunakan SheetJS:
       - Ambil daftar seluruh material eksisting dari Supabase untuk perbandingan lokal/server.
    3. Jalankan logika rekonsiliasi data:
       a. Cari kecocokan berdasarkan `ID Material` (jika ada) atau pencocokan teks case-insensitive pada `Nama Barang`.
       b. **Logika Update:** Jika nama barang cocok dan ada perbedaan pada `current_stock`, `unit_price`, `minimum_stock`, atau `unit`, tandai untuk diupdate.
       c. **Logika Skip:** Jika data barang dan stoknya persis sama dengan database, abaikan baris tersebut tanpa melakukan write DB.
       d. **Logika Insert:** Jika nama barang belum ada di database, buat record baru di tabel `materials` dengan ID baru (`gen_random_uuid()`).
    4. Tampilkan preview ringkasan sebelum eksekusi commit:
       "X barang akan diupdate, Y barang baru akan ditambahkan, Z barang di-skip (tidak ada perubahan)".
    5. Jalankan batch upsert/update ke Supabase dan beri toast notifikasi sukses rekonsiliasi stok.
  </action>
  <verify>Ubah angka stok pada 1 barang di Excel dan tambahkan 1 baris barang baru, lalu upload file tersebut: pastikan modal menampilkan ringkasan yang sesuai dan database Supabase ter-update dengan tepat.</verify>
  <done>Sistem berhasil melakukan sinkronisasi massal dari Excel dengan aturan skip, update, dan insert.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] Upload excel menampilkan preview ringkasan yang akurat.
- [ ] Database materials terupdate dengan benar (update, insert, skip).
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>
