# RobelKaroseri Management System - ROADMAP

> Milestone 1 completed. Gap Analysis Wave 1 to Wave 4 defined.

---

### Phase 1: Pengaturan Sistem & Manajemen Pengguna
**Status**: ✅ Done
**Objective**: Implementasikan modul Workshop Settings & User Management khusus untuk hak akses 'owner'. Memungkinkan owner untuk mengatur profil pengguna dan konfigurasi bengkel.
**Depends on**: Milestone 1

**Tasks**:
- [x] Buat file migrasi database untuk tabel `workshop_settings` dan perbarui RLS.
- [x] Buat komponen UI (Halaman Pengaturan Bengkel) dengan React dan Tailwind CSS, menggunakan lucide-react.
- [x] Konfigurasi routing untuk `/admin/settings` khusus role `owner`.

**Verification**:
- [x] TypeScript build/lint passed.
- [x] UI sesuai requirement.

---

### Phase 2: Perbaikan Input Hulu (SPK & RAB)
**Status**: ✅ Done
**Objective**: Mengeksekusi Wave 1 dari Gap Analysis untuk SPK dan RAB.
**Depends on**: Phase 1

**Tasks**:
- [x] Penambahan field VIN/Sasis dan Nomor Mesin pada `SpkForm` dan tabel `spk`.
- [x] Koneksi `RabCalculator` ke backend agar Estimasi RAB benar-benar tersimpan ke DB (`rab_estimations` & `rab_items`).
- [x] Integrasi Kalkulasi *Time-Based Overhead* di RAB berdasarkan `workshop_settings`.

**Verification**:
- [x] Database schema untuk SPK dan RAB diperbarui.
- [x] Input di UI masuk ke backend Supabase dengan benar.

---

### Phase 3: Aktualisasi Produksi (WBS & Logistik)
**Status**: ✅ Done
**Objective**: Mengeksekusi Wave 2 dari Gap Analysis untuk validasi aktual di lantai pabrik dan gudang.
**Depends on**: Phase 2

**Tasks**:
- [x] Integrasi backend pada komponen `WbsChecklist.tsx`.
- [x] Hubungkan `GoodsIssueForm.tsx` dengan estimasi aktual RAB untuk validasi limit.
- [x] Penambahan fitur Retur Material dan Peringatan Stockout (Stok Kritis).

**Verification**:
- [x] Status WBS tersimpan di Supabase.
- [x] Pengeluaran barang dibatasi oleh limit RAB secara riil.
- [x] Gudang dapat mencatat retur barang dan melihat stok kritis.

---

### Phase 4: Validasi QC & Handover (Hilir)
**Status**: ✅ Done
**Objective**: Mengeksekusi Wave 3 dari Gap Analysis untuk integrasi backend QC, pencatatan DP awal, dan penagihan akhir di Kasir.
**Depends on**: Phase 3

**Tasks**:
- [x] Implementasi form DP awal di KasirDashboard untuk memicu SPK ACTIVE.
- [x] Integrasi penuh QcInspectionForm ke tabel qc_inspections beserta parameter Uji Kelistrikan (Gate 3).
- [x] Penagihan Akhir dan Invoice berbasis cost aktual (material dan jasa) dari Supabase.

**Verification**:
- [x] Pembayaran DP mengubah status SPK.
- [x] Laporan QC tersimpan ke database.
- [x] Bill akhir berdasarkan real cost (inventory_transactions).

---

### Phase 5: Integrasi Mandor Terminal (Wave 4)
**Status**: ✅ Complete
**Objective**: Implementasi fitur fetching Active SPK dan integrasi penuh Taskboard WBS serta QC Hard-Gate untuk user Mandor di lantai bengkel.
**Depends on**: Phase 4

**Tasks**:
- [x] Koneksikan fetching SPK aktif dan state selector di Mandor Terminal.
- [x] Aktifkan integrasi riil Supabase pada WbsChecklist dan QcInspectionForm.

**Verification**:
- [x] SPK berstatus ACTIVE muncul di Mandor Dashboard.
- [x] WBS Checklist tersimpan ke DB.
- [x] Hasil QC Inspection tersimpan ke tabel `qc_inspections`.

---

### Phase 6: Monitoring (Admin) - Wave 4
**Status**: ✅ Complete
**Objective**: Mengeksekusi Wave 4 dari Gap Analysis untuk menambahkan visualisasi Actual Costing di Admin Dashboard dan Audit Log untuk SPK Cancel.
**Depends on**: Phase 5

**Tasks**:
- [x] Visualisasi dasbor Actual Costing yang membandingkan Total Estimasi RAB dengan Pengeluaran Logistik (inventory_transactions).
- [x] Tambahkan Audit Log Monitoring SPK Cancel di Admin Dashboard.

**Verification**:
- [x] Admin Dashboard memunculkan chart komparasi biaya aktual vs estimasi.
- [x] Terdapat tabel log khusus pembatalan (status = CANCELLED).

---

### Phase 7: Riwayat Pembayaran DP (Kasir)
**Status**: ✅ Complete
**Objective**: Implementasi Fitur Riwayat/Histori Pembayaran DP di Kasir Dashboard.
**Depends on**: Phase 6

**Tasks**:
- [x] Tambahkan filter Riwayat DP Diterima dan komponen tabel histori pada KasirDashboard.

**Verification**:
- [x] Kasir dapat melihat seluruh riwayat uang muka yang telah dibayarkan konsumen.

---

### Phase 8: Material Requisition & SPK Borongan Mandor
**Status**: ✅ Complete
**Objective**: Implementasi Modul Permintaan Material (Requisition) dari Mandor, opsi Material Konsumen, dan manajemen SPK Borongan (SPK-B) per sub-WBS.
**Depends on**: Phase 7

**Tasks**:
- [x] Implementasi form permintaan material oleh Mandor per WBS dan panel persetujuan di Gudang.
- [x] Opsi pencatatan `is_customer_supplied = true` (harga = Rp 0) agar tidak masuk tagihan akhir.
- [x] Modul penugasan tenaga borongan per sub-WBS beserta nilai kontrak.
- [x] Fitur ekspor/cetak SPK Borongan (SPK-B).
- [x] Fitur Opname Fisik & re-assign tenaga borongan jika terjadi pergantian di tengah jalan.

**Verification**:
- [x] Mandor dapat merequest barang dan disetujui oleh gudang.
- [x] Barang dengan flag customer supplied bernilai Rp 0 di tagihan Kasir.
- [x] SPK-B dapat dicetak dan proses opname fisik dapat mereset progress/men-generate SPK-B lanjutan.

---

### Phase 9: Manajemen Inventaris Bahan Gudang
**Status**: ✅ Complete
**Objective**: Implementasi Fitur Manajemen Inventaris Bahan Gudang (CRUD, Export XLSX, dan Smart Bulk Import)
**Depends on**: Phase 8

**Tasks**:
- [x] Buat komponen tabel manajemen inventaris dan modal CRUD di Warehouse
- [x] Implementasi fitur download/export seluruh data materials ke XLSX
- [x] Implementasi smart import XLSX dengan logika skip, update, dan insert baru

**Verification**:
- [x] UI Manajemen Inventaris berfungsi dan sinkron dengan Supabase.
- [x] Export dan import file XLSX tervalidasi.

---

### Phase 10: Seleksi Checklist dan Hapus Bersama (Bulk Delete)
**Status**: ✅ Complete
**Objective**: Implementasi Fitur Seleksi Checklist dan Hapus Bersama (Bulk Delete) pada Manajemen Inventaris Gudang.
**Depends on**: Phase 9

**Tasks**:
- [ ] TBD (run /plan 10 to create)

**Verification**:
- TBD

---

### Phase 11: Seleksi Hapus (Void Issue) & Edit Harga Khusus pada Recent Material Issues
**Status**: ✅ Complete
**Objective**: Implementasi Fitur Seleksi Hapus (Void Issue) & Edit Harga Khusus pada Recent Material Issues di Manajemen Gudang.
**Depends on**: Phase 10

**Tasks**:
- [ ] TBD (run /plan 11 to create)

**Verification**:
- TBD

---

### Phase 12: Penyelarasan Nama Kolom Database pada Download Template Excel Material Inventaris
**Status**: ✅ Complete
**Objective**: Implementasi Fitur Penyelarasan Nama Kolom Database pada Download Template Excel Material Inventaris di Manajemen Gudang.
**Depends on**: Phase 11

**Tasks**:
- [ ] TBD (run /plan 12 to create)

**Verification**:
- TBD

---

### Phase 13: Implementasi Fitur Paket Barang Jadi (BOM)
**Status**: ✅ Complete
**Objective**: Implementasi Fitur Paket Barang Jadi (Bill of Materials / Assembly Kits) pada Gudang.
**Depends on**: Phase 12

**Tasks**:
- [x] 13.1: Skema Database & BOM Builder untuk Paket Barang Jadi

**Verification**:
- [x] Schema database termigrasi.
- [x] UI PackageManager berjalan tanpa error.

---

### Phase 14: Search Autocomplete Material di BOM
**Status**: ✅ Complete
**Objective**: Implementasi Fitur Search Autocomplete Keyboard-Navigated untuk Pemilihan Bahan Material pada Modal BOM.
**Depends on**: Phase 13

**Tasks**:
- [x] 14.1: Implementasi Fitur Search Autocomplete Keyboard-Navigated

**Verification**:
- [x] Komponen MaterialAutocomplete berfungsi dengan pencarian, navigasi panah, dan pembaruan input.


---

### Phase 15: Gap Closure (Perluasan Akses Modul Paket Barang Jadi)
**Status**: ✅ Complete
**Objective**: Address gaps from milestone audit (Perluasan akses BOM ke Owner dan Advisor)

**Gaps to Close:**
- [x] Perluasan Akses Modul Paket Barang Jadi (BOM) ke Role Owner dan Service Advisor

---

### Phase 16: Pemecahan Kuota Material ke WBS 1-5 pada RAB Calculator
**Status**: ✅ Complete
**Objective**: Implementasi Fitur "Pilih Paket Barang Jadi & Pemecahan Kuota Material ke WBS 1-5" pada RAB Calculator
**Depends on**: Phase 15

**Tasks**:
- [ ] 16.1: Buat komponen modal alokasi paket BOM ke WBS (PackageAllocationModal)
- [ ] 16.2: Integrasikan pemilih paket dan modal alokasi pada RabCalculator

**Verification**:
- Sisa kuota berkurang secara visual setiap kali angka diinputkan pada kolom WBS 1..5.
- Baris tabel RAB menampilkan kategori WBS yang sesuai dengan alokasi yang ditentukan oleh Service Advisor.
---

### Phase 17: Edit Alokasi Paket BOM & Tracking Jatah Kuota Terpakai di RAB Calculator
**Status**: ✅ Complete
**Objective**: Address gaps from milestone audit (Edit Alokasi Paket BOM & Tracking Jatah Kuota Terpakai di RAB Calculator)

**Gaps to Close:**
- [ ] Komponen material tidak bisa diedit setelah dialokasikan ke WBS 1 s/d WBS 5 dan masuk ke tabel RAB.
- [ ] Nilai alokasi yang pernah diisi sebelumnya tidak tersimpan/termuat kembali.

---

### Phase 18: Gap Closure (Simpan Draf Alokasi Parsial Paket BOM dan Kunci SPK Menuju Kasir)
**Status**: ✅ Complete
**Objective**: Address gaps from milestone audit (Izinkan Simpan Draf Alokasi Parsial Paket BOM dan Kunci SPK Menuju Kasir)

**Gaps to Close:**
- [x] Buka kunci tombol Terapkan ke RAB untuk alokasi parsial di PackageAllocationModal
- [x] Proteksi filter antrean SPK Kasir dari RAB alokasi parsial

---

### Phase 19: Gap Closure (Simpan & Terapkan Pembagian WBS Bawaan pada Paket BOM)
**Status**: ✅ Complete
**Objective**: Address gaps from milestone audit (Simpan & Terapkan Pembagian WBS Bawaan pada Paket Barang Jadi)

**Gaps to Close:**
- [x] Penambahan kolom `default_wbs_allocation` pada `package_items`
- [x] Fitur checkbox simpan alokasi WBS bawaan di PackageAllocationModal dan pemuatan alokasi bawaan secara otomatis

---

### Phase 20: Gap Closure (Ganti Import Template dengan Fitur Export XLSX dan PDF)
**Status**: ✅ Complete
**Objective**: Address gaps from milestone audit (Mengganti tombol import template dengan Export XLSX dan fungsi Export PDF/Cetak pada RAB Calculator)

**Gaps to Close:**
- [x] Ganti Import Template dengan Fitur Export XLSX dan PDF pada RAB Calculator

---

### Phase 21: Gap Closure (Implementasi Approval Workflow untuk Change Orders)
**Status**: ✅ Complete
**Objective**: Address gaps from milestone audit (Implementasi Approval Workflow untuk Change Orders)

**Gaps to Close:**
- [x] Tambahkan aksi Approve dan Reject pada Change Orders SPK

---

### Phase 22: Gap Closure (Integrasi Amandemen SPK ke Billing Calculator Kasir)
**Status**: ✅ Complete
**Objective**: Address gaps from milestone audit (Integrasikan Amandemen SPK Approved ke Billing Calculator Kasir)

**Gaps to Close:**
- [ ] Tarik spk_amendments approved dan integrasikan ke perhitungan kasir

---

### Phase 23: Gap Closure (Perbaikan Integrasi Biaya Change Order Approved pada Penagihan Kasir SPK)
**Status**: ✅ Complete
**Objective**: Sertakan amandemen disetujui ke dalam query dan formula kalkulasi kasir

**Gaps to Close:**
- [ ] Biaya Change Order yang disetujui terhitung di pelunasan kasir secara akurat.

---

### Phase 24: Gap Closure (Perbaikan Formula Pelunasan Akhir Kasir dengan Mengikutsertakan Nilai Change Order Approved)
**Status**: ✅ Complete
**Objective**: Sertakan change order approved ke kalkulasi subtotal dan final bill kasir

**Gaps to Close:**
- [ ] Penagihan pelunasan akhir di kasir menghitung seluruh pekerjaan tambahan yang telah disetujui owner secara akurat.

---

### Phase 25: Backup dan Restore Database (Owner)
**Status**: ✅ Complete
**Objective**: Implementasikan fitur Backup dan Restore database menyeluruh khusus untuk role Owner dengan format `.sql.gz` (Zero Residu Server).
**Depends on**: Phase 24

**Tasks**:
- [ ] 25.1: Backend Endpoint Backup & Restore (In-Memory Streaming)
- [ ] 25.2: UI Dashboard Owner Backup & Restore

**Verification**:
- Skenario end-to-end backup dan restore tanpa file residu.

---

### Phase 26: Integrasi Cloudinary Direct Upload untuk Foto Kendaraan 360° (Check-in)
**Status**: ✅ Complete
**Objective**: Implementasikan pengunggahan dan penyajian foto kendaraan langsung dari klien (Zero Server Bandwidth) menggunakan Cloudinary.
**Depends on**: Phase 25

**Tasks**:
- [ ] 26.1: Konfigurasi utilitas dan Cloudinary di sisi klien.
- [ ] 26.2: Implementasi form upload langsung (Direct Upload) di "Vehicle Check-in".
- [ ] 26.3: Tampilan galeri foto kendaraan responsif menggunakan CDN.

**Verification**:
- Klien browser mengunggah file gambar ke Cloudinary tanpa masuk ke backend.
- Komponen menggunakan parameter transformasi Cloudinary (`f_auto`, `q_auto`, `c_limit`).
- Metadata foto disimpan dengan sukses di Supabase.

---

### Phase 27: Implementasi Tombol Aksi dan Modal Pratinjau "Galeri Foto 360°"
**Status**: ✅ Complete
**Objective**: Implementasikan tombol aksi dan modal pratinjau Galeri Foto 360° pada daftar Recent SPK di halaman `/service-advisor`.
**Depends on**: Phase 26

**Tasks**:
- [ ] 27.1: Implementasi Modal Galeri dan Tombol Aksi di SPK List.
- [ ] 27.2: Fitur Lightbox / Fullscreen Viewer untuk Insfeksi Detail.

**Verification**:
- Tombol aksi muncul di tabel, nonaktif jika tak ada foto.
- Modal terbuka menampilkan grid foto dengan label, memuat gambar dari Cloudinary CDN.
- Fitur lightbox dapat menampilkan gambar resolusi tinggi tanpa error.

---

### Phase 28: Upload Foto 360° Langsung dari Modal Galeri SPK
**Status**: ✅ Complete
**Objective**: Implementasikan fitur Direct Upload foto 360° ke Cloudinary langsung dari dalam modal "Galeri Foto 360°" pada SPK terkait di portal Service Advisor (`/service-advisor`), serta simpan URL dan public_id acak (randomized) ke database Supabase.
**Depends on**: Phase 27

**Tasks**:
- [ ] 28.1: Antarmuka Upload di Dalam Modal Galeri dan Direct Upload Client-to-Cloudinary
- [ ] 28.2: Penyimpanan Metadata ke Database Supabase dan Validasi

**Verification**:
- Pengguna dapat melakukan drag-and-drop / klik tombol unggah foto baru dari modal galeri.
- File gambar diunggah ke Cloudinary dan disajikan melalui URL kompresi responsif.
- Data metadata foto yang diunggah disimpan di Supabase, dan galeri modal di-refresh secara otomatis tanpa menutup modal.

---

### Phase 29: Gap Closure (Perbaikan Kalkulasi Total Harga Jual Paket BOM pada Kasir)
**Status**: ✅ Complete
**Objective**: Address gaps from milestone audit (Perbaikan kalkulasi Total Harga Jual dari Paket Barang Jadi di halaman Kasir)

**Gaps to Close:**
- [x] Pada halaman Kasir, "Paket Assembly List" masih menampilkan Rp 0,00 dan "Total Harga Jual" jatuh ke nilai fallback HPP, seharusnya mengambil dari `product_packages.selling_price`.

---

### Phase 30: Gap Closure (Modul Progres & Galeri Dokumentasi Lapangan pada Halaman /mandor)
**Status**: ✅ Complete
**Objective**: Address gaps from milestone audit (Menyediakan antarmuka bagi Mandor/Kepala Bengkel untuk mencatat progres persentase fisik tiap tahapan WBS (1 s/d 5) serta mengunggah galeri foto bukti pengerjaan per kategori WBS.)

**Gaps to Close:**
- [x] Tambahkan tracking progress percentage di tabel `wbs_checklists` dan UI interaktif (slider/stepper)
- [x] Hitung total progres proyek SPK secara otomatis
- [x] Tambahkan field `wbs_category` di tabel `spk_assets` dan fungsionalitas unggah foto bukti pengerjaan per kategori WBS (mandatori untuk set status 100%)

---

### Phase 31: Gap Closure (Hak Akses Edit Laporan Pengerjaan WBS & Galeri Foto untuk Owner dan Service Advisor)
**Status**: ✅ Complete
**Objective**: Address gaps from milestone audit (Memberikan hak akses edit WBS dan galeri foto ke Owner dan Service Advisor)

**Gaps to Close:**
- [x] Izinkan role owner dan service_advisor untuk memperbarui checklist dan progres fisik WBS
- [x] Izinkan role owner dan service_advisor untuk mengunggah, melihat, dan mengelola galeri foto WBS
- [x] Sesuaikan RLS tabel wbs_checklists dan spk_assets
- [x] Sediakan akses antarmuka (komponen/modal) pada dashboard Owner dan Service Advisor

---

### Phase 32: Gap Closure (Batasi Akses Modul WBS dan QC untuk SPK DRAFT)
**Status**: ✅ Complete
**Objective**: Address gaps from milestone audit (Mencegah SPK berstatus DRAFT muncul di list WBS/QC dan memblokir akses jika dibuka paksa)

**Gaps to Close:**
- [x] Filter query list SPK pada Mandor Dashboard agar tidak memunculkan status DRAFT
- [x] Tambahkan route guard/perlindungan komponen untuk memblokir form WBS/QC bila SPK statusnya DRAFT
- [x] Tambahkan policy / function db guard untuk menolak insert/update checklist WBS & QC pada SPK DRAFT

---

### Phase 33: Gap Closure (Portal Publik Laporan Progres Pengerjaan Unit via Nomor Rangka & Generator PDF Progres)
**Status**: ✅ Complete
**Objective**: Address gaps from milestone audit (Memberikan akses publik ke progress report dengan batasan rate limit & PDF eksport)

**Gaps to Close:**
- [x] Pembuatan Halaman / Route Publik (`/tracking/:vin`) dengan validasi SPK bukan DRAFT dan DP sudah diverifikasi
- [x] Implementasi Mekanisme Rate Limiting (Maksimal 5x Sehari per VIN)
- [x] Modul Generator Cetak PDF untuk merender progress bar, daftar WBS, dan grid foto (3 kolom)
- [x] Integrasi pada Halaman Kasir (`/kasir`) untuk menampilkan tombol Salin Tautan Pelacakan Konsumen

---

### Phase 34: Gap Closure (Refactor Parameter URL Publik Pelacakan Progres ke SPK No)
**Status**: ✅ Complete
**Objective**: Address gaps from milestone audit (Mengubah identifier pelacakan publik dari VIN/Sasis menjadi Nomor SPK)

**Gaps to Close:**
- [x] Ubah definisi route dari `/tracking/:vin` menjadi `/tracking/:spk_no` pada frontend router
- [x] Sesuaikan query Supabase agar mencari berdasarkan kolom `spk_no`
- [x] Perbarui struktur cache key rate limit dari `tracking_limit_{vin}_{date}` menjadi `tracking_limit_{spk_no}_{date}`
- [x] Perbarui tombol "Salin Tautan Pelacakan" di halaman Kasir agar menggunakan identifier SPK No

---

### Phase 35: Gap Closure (Aksi Pelacakan Konsumen pada Histori DP Kasir)
**Status**: ✅ Complete
**Objective**: Address gaps from milestone audit (Tampilkan link dan aksi salin/akses tautan pelacakan progres konsumen pada kartu "Riwayat DP Diterima" di halaman `/kasir`)

**Gaps to Close:**
- [x] Buat kontainer link pelacakan publik SPK di baris bawah card histori DP
- [x] Implementasikan tombol "Salin Link Pelacakan"
- [x] Implementasikan tautan "Buka Laporan Progres" (buka tab baru)
- [x] Pastikan perlindungan view: hanya muncul jika status bukan DRAFT dan DP sudah lunas/ada nilai

---

### Phase 36: Gap Closure (Modul Manajemen Inventory & Audit Log di Service Advisor)
**Status**: ✅ Complete
**Objective**: Address gaps from milestone audit (Modul Manajemen Inventory & Audit Log Perubahan di Halaman /service-advisor)

**Gaps to Close:**
- [x] Modul Manajemen Inventory & Audit Log Perubahan di Halaman /service-advisor

---

### Phase 37: Gap Closure (Restocking Cepat Material Inventory dengan Pencatatan Audit Log di /warehouse)
**Status**: ⬜ Not Started
**Objective**: Address gaps from milestone audit (Restocking Cepat Material Inventory dengan Pencatatan Audit Log di /warehouse)

**Gaps to Close:**
- [ ] Fitur Restocking Cepat Material Inventory dengan Pencatatan Audit Log di /warehouse

---

### Phase 38: Gap Closure (Perbaikan UX & Alur Modal Restock Material di /warehouse)
**Status**: ✅ Complete
**Objective**: Konsolidasi langkah pencarian dan form input pada Modal Restock, dukungan autocomplete keyboard & scroll, dan reset state saat dibatalkan.

**Gaps to Close:**
- [x] Konsolidasi modal pencarian material & pengisian menjadi satu modal tunggal
- [x] Perbaikan max-height dan z-index serta navigasi keyboard pada dropdown autocomplete
- [x] Reset state form sepenuhnya ketika modal ditutup atau dibatalkan

---

### Phase 39: Gap Closure (Perbaikan Keamanan Navigasi Login & Idle Timeout)
**Status**: ✅ Complete
**Objective**: Address gaps from milestone audit (Cegah Akses Halaman Login Ketika Sesi Masih Aktif & Auto Idle Timeout)

**Gaps to Close:**
- [x] Guest Route Guard pada Halaman Login untuk mencegah akses saat sesi aktif (redirect ke role dashboard)
- [x] Penyesuaian navigasi pasca login (replace history)
- [x] Mekanisme Auto Idle Session Timeout (15 menit tanpa aktivitas, auto logout)

---

### Phase 40: Gap Closure (Penyatuan Input Tenaga Kerja ke Dalam Pencarian Material RAB)
**Status**: ✅ Complete
**Objective**: Address gaps from milestone audit (Menghapus opsi radio "Labor" dan menyatukan pencarian jasa/tenaga kerja ke kotak pencarian material)

**Gaps to Close:**
- [x] Hapus Radio Button Opsi "Labor" pada form Add Estimation Item di RAB Calculator
- [x] Satukan input tenaga kerja melalui Master Material (tabel `materials`)
- [x] Sesuaikan handler insert agar semua item jasa dan bahan fisik masuk ke `rab_items` menggunakan relasi `material_id`

---

### Phase 41: Gap Closure (Matriks Alokasi Multi-WBS pada Penambahan Item Manual RAB)
**Status**: ✅ Complete
**Objective**: Address gaps from milestone audit (Ganti Dropdown WBS Tunggal Menjadi Alokasi Matriks Multi-WBS dengan Dukungan Desimal dan Validasi PASSED)

**Gaps to Close:**
- [x] Ubah antarmuka "Add Estimation Item" menjadi matriks WBS 1 s/d 5 pengganti dropdown kategori WBS.
- [x] Implementasikan validasi *real-time* (Sisa / Over) dan pembatasan "PASSED" untuk bisa disubmit.
- [x] Refactor logika pe-nyimpanan item manual agar meng-*insert* baris majemuk berdasarkan nilai alokasi matriks yang valid.