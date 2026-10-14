## Current Position
- **Phase**: 74 (Gap Closure: Bugfix Logika: Perbaikan Nilai "Sebelum" dan "Sisa Stok" Menjadi 0 pada Widget "Riwayat Approval & Stok" di /warehouse)
- **Task**: Implementation completed (ready for manual review, manual test, & git commit by user)
- **Status**: Implemented & Ready for Manual Verification

## Last Session Summary
Phase 74 diimplementasikan secara komprehensif mengikuti seluruh rincian spesifikasi dan batasan pengguna:
1. `src/components/RecentApprovedMaterials.tsx`:
   - Deteksi Snapshot Dummy Default: Memperbaiki logika penentuan validitas snapshot. Jika `stock_before === 0` dan `stock_after === 0` sedangkan stok aktual material (`materials.current_stock`) atau kuantitas keluar (`qty`) bernilai positif, sistem mengenali data tersebut sebagai transaksi lama yang terisi nilai default dari migrasi database.
   - Fallback Rekonsiliasi Cerdas:
     * `stockAfter = currentMatStock` (misal 20 PCS).
     * `stockBefore = currentMatStock + qty` (misal 20 + 3 = 23 PCS).
   - Menjamin kartu riwayat lama (seperti "MATA GERINDA POTONG") langsung menampilkan angka pergerakan stok riil yang akurat: **Sebelum: 23, Disetujui: -3, Sisa Stok: 20**.
2. `src/components/GoodsIssueForm.tsx`:
   - Penyesuaian Pengeluaran Langsung: Pada saat form "Issue Material" disubmit, sistem melakukan kueri stok aktual terkini dari `materials`, menghitung `stockBefore` dan `stockAfter`, serta menyimpannya ke `inventory_transactions` dengan fallback retry yang aman.
3. `src/components/RequisitionApproval.tsx`:
   - Memastikan pemetaan `spk_id` pada transaksi persetujuan menggunakan `requisition.spk?.id || requisition.spk_id` secara defensif.
4. `supabase/migrations/20261014_backfill_stock_audit_snapshot.sql`:
   - Dibuat skrip SQL rekonsiliasi data lama untuk mengupdate kolom `stock_before` dan `stock_after` pada baris riwayat `inventory_transactions` yang sebelumnya bernilai 0. Skrip disiapkan untuk dijalankan manual di SQL Editor Supabase.
5. Kepatuhan Batasan:
   - Tanpa verifikasi otomatis (no auto-verify).
   - Tanpa git commit otomatis (no auto-commit).
   - Tanpa eksekusi otomatis migrasi Supabase.

## Blockers
None.

## Next Steps
1. (Opsional) Jalankan skrip rekonsiliasi database `supabase/migrations/20261014_backfill_stock_audit_snapshot.sql` di SQL Editor Supabase untuk memperbarui data baris lama secara permanen di database.
2. Pengguna membuka halaman `/warehouse` di browser (login sebagai `petugas_gudang` atau `owner`).
3. Pada panel kanan "Riwayat Approval & Stok":
   - Periksa kartu material riwayat lama (seperti "MATA GERINDA POTONG"):
     * Nilai **Sebelum** kini menampilkan stok aktual sebelum keluar (misal: 23).
     * Nilai **Disetujui** menampilkan `-3`.
     * Nilai **Sisa Stok** menampilkan sisa fisik saat ini (misal: 20).
     * Tidak ada lagi angka 0/0 yang keliru.
4. Uji Pengeluaran Material Baru:
   - Lakukan approval pada "Pending Requisitions" atau submit pada form "Issue Material".
   - Amati kartu baru tercatat dengan nilai snapshot akurat secara real-time.
5. Pengguna melakukan review kode dan git commit secara manual.




