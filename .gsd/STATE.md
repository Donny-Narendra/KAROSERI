## Current Position
- **Sprint**: Sprint 1 (Fix item transfer isolation in Mandor Material Requisition modal)
- **Status**: Sprint in progress
- **Milestone**: (paused while sprint is active - Phase 75 completed)

## Last Session Summary
Phase 75 diimplementasikan secara komprehensif mengikuti seluruh rincian spesifikasi dan batasan pengguna:
1. `src/components/RequisitionApproval.tsx`:
   - Kueri Fetch Eager Join: Memperbaiki kueri `supabase.from('material_requisitions').select(...)` dengan menyertakan `materials ( id, name, unit, unit_price )`, `spk_id`, `requested_by`, dan `status`.
   - Normalisasi Defensif Data: Menangani array item dengan fallback `material_requisition_items` maupun `items`, serta properti relasi `material` dan `materials`. Setiap item secara otomatis memiliki `unit_price`, `quantity`, dan `subtotal` yang terhitung rapi.
   - Perhitungan Akumulasi Biaya: Menghitung `totalRequisitionCost` untuk setiap kartu requisition.
   - Desain Ulang Tabel Rincian Material 4 Kolom:
     * `MATERIAL`: Ditampilkan dengan teks tebal kontras tinggi (`font-bold text-text text-sm`) beserta ID material.
     * `JUMLAH DIMINTA`: Ditampilkan dengan angka kuantitas beserta satuan (`${item.quantity} ${item.material?.unit || 'pcs'}`).
     * `ESTIMASI HARGA (RP)`: Diformat Rupiah (`Rp ${(item.material?.unit_price || 0).toLocaleString('id-ID')}`).
     * `SUBTOTAL (RP)`: Perkalian kuantitas dan harga satuan dalam format Rupiah.
     * Empty State Row: Menampilkan baris informatif *"Tidak ada rincian material pada permintaan ini"* jika tidak ada item.
     * Footer Tabel: Menampilkan ringkasan total **"Total Estimasi Biaya Requisition: Rp X.XXX.XXX"** dengan highlight aksen oranye RobelKaroseri.
   - Penyesuaian Kotak Peringatan Gate 2: Mengintegrasikan angka akumulasi belanja riil:
     *"Pagu Gate 2 (RAB vs Aktual): Total Permintaan: Rp X.XXX.XXX. Pastikan jumlah ini sesuai dengan alokasi RAB sebelum menyetujui."*
   - Dialog Konfirmasi Approval: Menyertakan total estimasi belanja untuk kejelasan petugas gudang sebelum menyetujui dan memotong stok.
2. `supabase/migrations/20261014_add_unit_price_to_material_requisition_items.sql`:
   - Dibuat skrip SQL untuk menambahkan kolom `unit_price NUMERIC(15, 2) DEFAULT 0` pada tabel `material_requisition_items`.
   - Disertakan kueri backfill nilai `unit_price` dari master `materials` untuk data yang sudah ada sebelumnya.
   - Skrip disimpan di direktori migrasi untuk dieksekusi secara manual oleh pengguna di SQL Editor Supabase.
3. Kepatuhan Batasan:
   - Tanpa verifikasi otomatis (no auto-verify).
   - Tanpa git commit otomatis (no auto-commit).
   - Tanpa eksekusi otomatis migrasi Supabase.

## Blockers
None.

## Next Steps
1. (Opsional) Jalankan skrip database `supabase/migrations/20261014_add_unit_price_to_material_requisition_items.sql` di SQL Editor Supabase untuk menambahkan kolom `unit_price` dan melakukan backfill data secara permanen di database.
2. Pengguna membuka halaman `/warehouse` di browser (login sebagai `petugas_gudang` atau `owner`) dan klik tab **"Mandor Requests"**.
3. Pada kartu daftar antrean **"Pending Requisitions (Mandor)"**:
   - Periksa tabel 4 kolom: `MATERIAL` (tebal), `JUMLAH DIMINTA` (angka + unit), `ESTIMASI HARGA (RP)`, dan `SUBTOTAL (RP)`.
   - Periksa footer tabel bertuliskan **"Total Estimasi Biaya Requisition: Rp X.XXX.XXX"**.
   - Periksa kotak catatan kuning di bawah tabel: *"Pagu Gate 2 (RAB vs Aktual): Total Permintaan: Rp X.XXX.XXX. Pastikan jumlah ini sesuai dengan alokasi RAB sebelum menyetujui."*
4. Klik tombol **"Approve"** pada salah satu kartu dan amati dialog konfirmasi kini juga menampilkan total nominal permintaan.
5. Pengguna melakukan review kode dan git commit secara manual.
