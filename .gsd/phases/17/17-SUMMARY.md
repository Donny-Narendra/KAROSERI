# Phase 17: Edit Alokasi Paket BOM & Tracking Jatah Kuota Terpakai di RAB Calculator (Gap Closure)

## Tasks Completed
1. **Perbarui Tipe `RabItem`**:
   - Menambahkan properti opsional `packageId?: string` untuk melacak item mana saja yang berasal dari alokasi paket BOM.
2. **Update skema database `rab_items`**:
   - Menambahkan kolom `package_id uuid REFERENCES public.product_packages(id)` melalui migrasi `20261005020000_add_package_id_to_rab_items.sql`.
   - Menambahkan mapping `package_id` pada query dan mutasi database di dalam `RabCalculator.tsx`.
3. **Mode Edit dan Pencegahan Duplikasi (`RabCalculator.tsx`)**:
   - Mencegah opsi paket dipilih kembali (disabled dropdown) jika sudah dialokasikan ke RAB.
   - Menampilkan ringkasan "Paket BOM Diterapkan" berisi tombol "Edit Alokasi".
   - Saat "Edit Alokasi" diklik, modal terbuka dan mengirimkan prop `existingItems` yang difilter dari state berdasarkan `packageId` paket yang diedit.
   - Mengubah fungsi `handleApplyPackageAllocation` agar dapat me-replace (mengganti) baris RAB lama yang memiliki `packageId` yang sama (menghindari duplikasi)
4. **Modifikasi `PackageAllocationModal.tsx`**:
   - Menerima props `existingItems`.
   - Mengisi (populate) state initial allocations dengan data dari `existingItems` (mencocokkan WBS Category dan nama deskripsi material/labor).
   - Kondisi Sisa kuota otomatis dihitung dan jika semua sudah cocok nilainya 0 (PASSED).

## Verification Details
- `npx tsc -b` dan `npm run build` berhasil tanpa *error*.
- Kode React secara logika dapat memisahkan antara baris RAB yang berasal dari input manual vs yang berasal dari paket BOM, serta men-hydrate (memuat ulang) inputan lama ke dalam modal alokasi paket.
