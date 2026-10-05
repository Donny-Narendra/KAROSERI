# Summary: Simpan & Terapkan Pembagian WBS Bawaan

- Menambahkan kolom `default_wbs_allocation` bertipe JSONB ke tabel `package_items` via migrasi SQL.
- Memperbarui `packageService.ts` untuk menyimpan default alokasi per item, serta memastikan data ini tidak hilang saat paket diupdate.
- Memperbarui tipe `PackageItem` dengan tambahan properti `default_wbs_allocation`.
- Menambahkan UI checkbox "Simpan alokasi WBS ini sebagai template bawaan paket" pada `PackageAllocationModal.tsx`.
- Modal Alokasi secara otomatis memuat `default_wbs_allocation` untuk komponen paket ketika paket baru dipilih.
- Menyediakan logic penyimpangan di `RabCalculator.tsx` untuk melakukan looping penyimpangan template ke DB via Service.
