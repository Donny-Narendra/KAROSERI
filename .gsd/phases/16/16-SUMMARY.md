# Phase 16: Pemecahan Kuota Material ke WBS 1-5 pada RAB Calculator

## Tasks Completed
1. **Buat komponen modal alokasi paket BOM ke WBS (PackageAllocationModal)**:
   - Dibuat `PackageAllocationModal.tsx` yang menerima `packageData` dan memampukan Service Advisor memecah kuota masing-masing komponen (Bahan maupun Jasa) ke 5 tahapan WBS.
   - Sisa kuota per komponen dihitung secara reaktif. Jika belum seluruhnya terbagi (sisa > 0) atau kelebihan (sisa < 0), tombol Terapkan akan terkunci dan memunculkan badge *warning*.
2. **Integrasikan pemilih paket dan modal alokasi pada RabCalculator**:
   - Ditambahkan select dropdown "Pilih Paket Barang Jadi (BOM)" di atas tabel input item `RabCalculator`.
   - Fetches data `product_packages` menggunakan `packageService.getPackages()`.
   - Mengontrol visibilitas `PackageAllocationModal`.
   - Menerapkan fungsi `handleApplyPackageAllocation` untuk mengonversi hasil alokasi menjadi baris-baris state `rab_items` beserta *type* dan *description* yang sesuai.
   
## Verification Details
- `npm run build` tervalidasi dan typescript tipe pengecekan bebas *error*.
- Komponen siap dan dapat berjalan untuk memecah kuota BOM paket barang jadi ke masing-masing WBS 1 sampai 5.
