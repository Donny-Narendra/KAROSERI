# Summary: Proteksi Filter Antrean SPK Kasir

- Menambahkan field `allocation_status` (DEFAULT 'COMPLETE') ke tabel `spk` melalui file migrasi database.
- Memperbarui `KasirDashboard.tsx` dengan field tambahan `allocationStatus` pada type MockSPK.
- Filter antrean SPK (yang akan muncul di tab DP) sekarang hanya menampilkan SPK jika `allocationStatus !== 'PARTIAL'`.
- SPK yang masih dalam status alokasi parsial akan disembunyikan dari daftar Kasir hingga perencanaannya (RAB) divalidasi dan tuntas.
