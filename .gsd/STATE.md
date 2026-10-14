## Current Position
- **Phase**: 70 (Gap Closure: Refactor Filter SPK Menjadi List Box Vertikal di Sidebar Kanan Gudang pada /warehouse)
- **Task**: Implementation completed (ready for manual review, manual test, & git commit by user)
- **Status**: Implemented & Ready for Manual Verification

## Last Session Summary
Phase 70 diimplementasikan secara komprehensif mengikuti seluruh rincian kebutuhan dan batasan instruksi pengguna:
1. `src/components/SpkFilterListBox.tsx`:
   - Dibuat komponen List Box vertikal interaktif yang elegan bergaya dark industrial RobelKaroseri.
   - Header panel memuat judul "Filter Berdasarkan SPK", ikon filter, dan badge jumlah SPK aktif.
   - Container scrollable (`max-h-[550px] overflow-y-auto scrollbar-thin space-y-2 p-3`).
   - Item 1 (Default): Kartu "Semua SPK" dengan subteks "Tampilkan seluruh antrean permintaan mandor" dan badge total seluruh pending.
   - Item 2..N: Kartu masing-masing SPK memuat Nomor SPK (font-mono tebal), nama pelanggan/deskripsi unit (truncate rapi), badge jumlah pending, serta indikator aktif ("✓ Aktif").
   - Highlight kartu aktif dengan border oranye tegas (`border-primary bg-primary/10 shadow-sm ring-1 ring-primary`).
2. `src/components/RequisitionApproval.tsx`:
   - Pembersihan header panel "Pending Requisitions (Mandor)": seluruh elemen horizontal filter pills dihapus sehingga header kembali rapi dan lega.
   - Header kiri menampilkan icon ClipboardList, Judul "Pending Requisitions (Mandor)", dan badge total counter permintaan pending.
   - Indikator kecil filter aktif (beserta tombol reset cepat) muncul hanya saat filter SPK aktif dipilih.
   - Menerima props `selectedSpkFilter`, `onResetFilter`, dan menyalurkan daftar ringkasan SPK via callback `onSpkSummaryChange` ke parent.
   - Penyaringan kartu permintaan dilakukan secara reaktif, dilengkapi penanganan empty state ramah jika SPK yang dipilih tidak lagi memiliki permintaan pending.
3. `src/pages/WarehouseDashboard.tsx`:
   - State `selectedSpkFilter` dan `spkFilterList` dikelola secara terpusat.
   - Pada kolom sidebar kanan, ketika tab aktif adalah "Mandor Requests" (`activeTab === 'requisition'`), komponen `SpkFilterListBox` ditampilkan di atas widget "Low Stock Warnings".
   - Counter total pending pada badge tab tetap konsisten menampilkan seluruh beban kerja pending gudang.
4. Kepatuhan Batasan:
   - Tanpa verifikasi otomatis (no auto-verify).
   - Tanpa git commit otomatis (no auto-commit).
   - Tanpa eksekusi otomatis migrasi Supabase (tidak ada perubahan skema database baru yang diperlukan untuk refactor UI ini).

## Blockers
None.

## Next Steps
1. Pengguna login ke aplikasi dengan akun `petugas_gudang` atau `owner`.
2. Pengguna membuka halaman `/warehouse` dan memilih tab **Mandor Requests**:
   - Periksa panel kiri "Pending Requisitions (Mandor)": pastikan header sekarang bersih tanpa deretan pill horizontal.
   - Periksa panel samping kanan: pastikan muncul kartu **Filter Berdasarkan SPK** dengan opsi "Semua SPK" dan daftar kartu SPK (lengkap dengan Nomor SPK, Nama Pelanggan, dan badge pending).
   - Klik salah satu kartu SPK di panel kanan:
     * Amati kartu di panel kanan langsung mendapatkan highlight oranye aktif ("✓ Aktif").
     * Amati daftar permintaan di panel kiri langsung tersaring hanya menampilkan item milik SPK tersebut.
   - Klik kartu "Semua SPK" di panel kanan:
     * Amati daftar permintaan di panel kiri kembali menampilkan seluruh antrean.
3. Pengguna melakukan review kode, pengujian visual, dan git commit.
