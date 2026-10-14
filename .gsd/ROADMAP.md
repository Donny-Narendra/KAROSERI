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

---

### Phase 42: Gap Closure (Perbaikan Ketinggian & Penambahan Responsiveness Modal Terima DP)
**Status**: ✅ Complete
**Objective**: Address gaps from milestone audit (Memperbaiki layout dan scrolling modal Terima DP agar tidak terpotong di layar yang lebih kecil)

**Gaps to Close:**
- [x] Implementasikan container modal dengan `max-h-[90vh]` dan `flex flex-col`.
- [x] Terapkan Sticky Header dan Sticky Footer agar tombol aksi dan judul tidak ikut terscroll.
- [x] Ubah struktur konten menjadi scrollable body (`overflow-y-auto`).
- [x] Rampingkan margin, padding, dan area textarea agar lebih padat (*compact*).

---

### Phase 43: Gap Closure (Cetak Surat Tugas SPK Borongan dengan Nomor Surat Resmi)
**Status**: ✅ Complete
**Objective**: Address gaps from milestone audit (Mencetak dokumen resmi penugasan SPK Borongan dengan penomoran unik yang tersimpan di Supabase)

**Gaps to Close:**
- [x] Tambahkan kolom `assignment_letter_no` pada tabel `spk_borongan`.
- [x] Implementasikan auto-generate dan update nomor surat tugas sebelum pratinjau cetak.
- [x] Desain Template Cetak (Kop Surat, Detail Penugasan, Pengesahan, disembunyikan navigasi dengan `@media print`).

---

### Phase 44: Gap Closure (Penambahan Kolom qc_status & final_qc_checklist pada SPK serta Integrasi State Mandor dan Kasir)
**Status**: ✅ Complete
**Objective**: Address gaps from milestone audit (Penambahan kolom qc_status dan final_qc_checklist pada tabel public.spk serta binding hidrasi state pada Mandor Terminal dan Kasir Dashboard Gate 3)

**Gaps to Close:**
- [x] Tambahkan kolom `qc_status` dan `final_qc_checklist` pada tabel `public.spk` serta sesuaikan RLS untuk role mandor dan kasir.
- [x] Integrasikan fetching & hydration state checklist dan update `qc_status` pada komponen Final QC Mandor.
- [x] Integrasikan query billing dan validasi Gate 3 pada halaman Kasir berdasarkan kolom `spk.qc_status`.
- [x] Verifikasi type checking, build, dan uji alur end-to-end.

---

### Phase 45: Gap Closure (Dokumen BAST Profesional Siap Cetak & Release Vehicle di Kasir)
**Status**: ✅ Complete
**Objective**: Address gaps from milestone audit (Pembuatan Dokumen Berita Acara Serah Terima (BAST) Profesional Siap Cetak / Download PDF pada Aksi "Release Vehicle & Print BAST" di /kasir)

**Gaps to Close:**
- [x] Buat template cetak dokumen resmi BAST berukuran A4 portrait (`src/components/BastModal.tsx`) lengkap dengan Kop Surat RobelKaroseri, Nomor Surat resmi, spesifikasi kendaraan, status QC & pelunasan, serta 3 kolom pengesahan tanda tangan.
- [x] Terapkan styling CSS cetak (@media print) standar A4 portrait 1 lembar tanpa overflow, menyembunyikan background gelap dan tombol dashboard.
- [x] Hubungkan aksi "Release Vehicle & Print BAST" di `/kasir` untuk mengupdate status SPK menjadi `COMPLETED` dan membuka modal pratinjau BAST.
- [x] Verifikasi type checking, build, dan pengujian alur pada SPK-9846.

---

### Phase 46: Gap Closure (Perbaikan Print Layout 1 Halaman A4 Dokumen BAST di Kasir)
**Status**: ✅ Complete
**Objective**: Address gaps from milestone audit (Memperbaiki print preview modal BAST di /kasir agar pas 1 lembar A4 portrait bersih tanpa halaman kosong atau terpotong)

**Gaps to Close:**
- [x] Isolasi layout cetak menggunakan `#print-root` React portal dan sembunyikan seluruh flow `#root` dengan `body > *:not(#print-root) { display: none !important; }`.
- [x] Netralkan positioning modal pada media cetak (`position: static !important`, `transform: none !important`, `margin: 0 auto !important`).
- [x] Kompresi dimensi vertikal, padding tabel, dan margin internal `#printable-bast` (`padding: 8mm 12mm !important`, `@page { size: A4 portrait; margin: 8mm; }`) agar pas dalam 1 lembar A4.

---

### Phase 47: Gap Closure (Pemisahan Tombol Aksi Cetak Dokumen dan Download PDF pada Modal BAST di Kasir)
**Status**: ✅ Complete
**Objective**: Address gaps from milestone audit (Pemisahan tombol aksi gabungan menjadi dua tombol terpisah: "Download PDF" langsung via client-side PDF renderer dan "Cetak Dokumen" via browser print dialog)

**Gaps to Close:**
- [x] Instalasi dan konfigurasi library client-side PDF (`jspdf` dan `html2canvas`) untuk mengonversi `#printable-bast` menjadi berkas `BAST-{spk_no}.pdf`.
- [x] Pemisahan antarmuka header modal di `src/components/BastModal.tsx` menjadi dua tombol berdampingan ("Download PDF" beraksen emerald/teal dan "Cetak Dokumen" beraksen oranye/primer).
- [x] Penanganan state loading `isDownloadingPdf` dan integrasi class `no-print` pada kedua tombol aksi.
- [x] Verifikasi type checking, build validation, dan commit atomik.

---

### Phase 48: Gap Closure (Menampilkan Kolom Subtotal RAB pada Panel Panduan Material di Modal SPK Borongan)
**Status**: ✅ Complete
**Objective**: Address gaps from milestone audit (Menampilkan Kolom Subtotal RAB pada Panel "Panduan Material (RAB)" di Modal SPK Borongan)

**Gaps to Close:**
- [x] Penyesuaian Query dan Data Mapping pada `src/components/SpkBoronganPanel.tsx` untuk mengambil `item_total` dan `materials.unit_price`.
- [x] Penambahan Kolom Subtotal RAB (format Rupiah Indonesia) pada antarmuka tabel Panduan Material (RAB).
- [x] Penanganan edge cases (harga 0/null -> Rp 0, text wrap/lebar kolom) dan responsiveness.
- [x] Verifikasi type checking, build validation, dan commit atomik.

---

### Phase 49: Gap Closure (Implementasi Dual-List Transfer Box pada Modal Minta Material Requisition Mandor)
**Status**: ✅ Complete
**Objective**: Address gaps from milestone audit (Implementasi Dual-List Transfer Box pada Modal "Minta Material (Requisition)" di Halaman /mandor untuk WBS Terpilih)

**Gaps to Close:**
- [x] State Management & Data Fetching Dual-List pada `MaterialRequisitionForm.tsx` (`availableItems` dari RAB WBS aktif, `selectedItems` untuk requisition, transfer handlers `<<` dan `>>`).
- [x] Desain Layout UI Dual-List Transfer Box 2 Kolom (Kotak Kanan Merah untuk Alokasi RAB WBS, Panel Kontrol Tombol Transfer di Tengah, Kotak Kiri Hijau untuk Permintaan Siap Submit, Tombol "+ Add Item" untuk item ekstra).
- [x] Integrasi Submit Requisition ke tabel `material_requisitions` dan `material_requisition_items` dengan status PENDING serta validasi build & linter.

---

### Phase 50: Gap Closure (Tata Letak 3 Kolom Bersebelahan Modal Requisition untuk Tampilan Tablet & Desktop di /mandor)
**Status**: ✅ Complete
**Objective**: Address gaps from milestone audit (Penataan Ulang Layout Modal Requisition Menjadi 3 Kolom Bersebelahan pada Breakpoint Tablet md: dan Desktop)

**Gaps to Close:**
- [x] Penataan Layout Grid Responsif 3 Kolom Bersebelahan pada Breakpoint `md:` (`md:grid-cols-12`: 5 kolom Kiri Permintaan, 2 kolom Tengah Tombol Transfer, 5 kolom Kanan Alokasi RAB).
- [x] Penyeragaman Ketinggian Kontainer (`h-[420px] md:h-[460px]`), Scrollbar Mandiri per Kolom, dan Centering Tombol Transfer di Tengah (`self-center`).
- [x] Verifikasi Interaktivitas Transfer Dua Arah, Double-Click, Responsiveness Tablet/Desktop, Linter (`npx oxlint`), dan Build (`npm run build`).

---

### Phase 51: Gap Closure (Pembatalan Penugasan SPK-B, Filter Eksklusi Requisition, dan Transfer Interaktif Material RAB ke Form SPK-B)
**Status**: ✅ Complete
**Objective**: Address gaps from milestone audit (Fitur Pembatalan Penugasan SPK-B, Eksklusi Material Requisition, dan Transfer Interaktif Material RAB ke Form SPK-B pada /mandor)

**Gaps to Close:**
- [x] Tombol Batalkan / Hapus Penugasan pada Riwayat Penugasan SPK-B dengan konfirmasi dan pembersihan record di Supabase.
- [x] Filter Eksklusi Material yang Sudah Masuk ke "Daftar Permintaan Material" (Requisition) aktif pada WBS terkait.
- [x] Transfer Interaktif Material dari Panduan RAB ke Form Penugasan Baru SPK-B (via Double Click / <<) dengan Kemampuan Rollback.
- [x] Verifikasi Type Checking, Build Validation, dan Commit Atomik.

---

### Phase 52: Gap Closure (Eksklusi Material yang Sudah Digunakan dari Panel Alokasi RAB pada Modal Minta Material)
**Status**: ✅ Complete
**Objective**: Address gaps from operational feedback (Eksklusi Material yang Sudah Digunakan di Minta Material maupun SPK Borongan dari Panel Alokasi RAB WBS Terkait pada /mandor)

**Gaps to Close:**
- [x] Kueri Data Pembanding Cross-Module (`material_requisitions`/`material_requisition_items` dan `spk_borongan`) untuk SPK & WBS terkait pada modal `MaterialRequisitionForm.tsx`.
- [x] Logika Pemfilteran Panel "Alokasi RAB (WBS Terkait)" untuk mengecualikan material yang sudah diajukan via Requisition atau sudah ditugaskan pada SPK Borongan.
- [x] Sinkronisasi Badge & Indikator Sisa ("X item tersisa") pada header dan footer panel Alokasi RAB.
- [x] Verifikasi Type Checking, Build Validation (`npm run build`, `npx oxlint`), dan Commit Atomik (`fix(mandor): exclude items used in requisitions and spk borongan from rab allocation panel`).

---

### Phase 53: Gap Closure (Sinkronisasi Mutual Exclusion Material Antara Requisition dan SPK Borongan di Mandor)
**Status**: ✅ Complete
**Objective**: Address gaps from operational feedback (Sinkronisasi Mutual Exclusion Material Antara Requisition dan SPK Borongan pada /mandor)

**Gaps to Close:**
- [x] Skema / Data Tracking Penggunaan Item: Penambahan tracking `material_id` / `rab_item_id` pada penugasan SPK Borongan yang berasal dari transfer material RAB.
- [x] Utilitas Shared Availability Filter (`isRabItemAllocated`): Normalisasi teks case-insensitive, substring matching deskripsi tugas, dan validasi ID material cross-module.
- [x] Terapkan Filter di Kedua Modal: Saring panel "Alokasi RAB (WBS Terkait)" pada `MaterialRequisitionForm.tsx` dan panel "Panduan Material (RAB)" pada `SpkBoronganPanel.tsx` beserta counter reaktif.
- [x] Verifikasi Type Checking, Build (`npm run build`, `npx oxlint`), dan Commit Atomik (`fix(mandor): synchronize mutual exclusion between requisition and spk borongan material lists`).

---

### Phase 54: Gap Closure (Resolusi Foreign Key Mapping material_id pada Submit Requisition Material Mandor)
**Status**: ✅ Complete
**Objective**: Address gaps from operational feedback (Resolusi Foreign Key Mapping material_id pada Submit Requisition Material Mandor)

**Gaps to Close:**
- [x] Migrasi Skema Database: Kolom `material_id` nullable, penambahan kolom `rab_item_id`, `material_name`, `unit` pada `material_requisition_items`.
- [x] Audit & Perbaikan Payload Submit Requisition: Pemetaan `material_id` ke ID material master yang valid (atau null) dan `rab_item_id` ke ID item RAB asli pada `MaterialRequisitionForm.tsx`.
- [x] Penyelarasan Cross-Module: Dukungan `rab_item_id` dan fallback nama/unit material pada `rabItemAllocation.ts`, `SpkBoronganPanel.tsx`, dan `RequisitionApproval.tsx`.
- [x] Verifikasi Type Checking, Build (`npm run build`, `npx oxlint`), Database Insertion Test, dan Commit Atomik (`fix(mandor): resolve material_id foreign key mapping on material requisition submit`).

---

### Phase 55: Gap Closure (Persistensi Daftar Permintaan Material dan Dialog Konfirmasi Pengembalian di Mandor)
**Status**: ✅ Complete
**Objective**: Address gaps from operational feedback (Hydration/Persistensi Daftar Permintaan Material dan Konfirmasi Pembatalan/Pengembalian ke Alokasi RAB pada /mandor)

**Gaps to Close:**
- [x] Hydration Daftar Permintaan Material: Memuat item requisition aktif yang sudah tersimpan di database ke Kotak Kiri ("Daftar Permintaan Material") dengan status, quantity, dan unit yang sesuai.
- [x] Dialog Konfirmasi Pembatalan/Pengembalian: Konfirmasi dialog saat menekan tombol hapus (ikon tong sampah) atau tombol transfer `>>`, serta sinkronisasi penghapusan record di Supabase jika item sudah tersimpan.
- [x] Penyempurnaan Submit Requisition: Hanya mengirimkan item baru yang belum tersimpan ke Supabase dan memperbarui state secara reaktif.
- [x] Verifikasi Type Checking, Build (`npm run build`, `npx oxlint`), End-to-End Test, dan Commit Atomik (`feat(mandor): persist requisition items list and add confirmation dialog on item removal`).

---

### Phase 56: Gap Closure (Perbaikan Render Kartu Material Alokasi RAB vs Form Dropdown Ekstra pada Daftar Permintaan Material di Mandor)
**Status**: ✅ Complete
**Objective**: Address gaps from operational feedback (Perbaikan Render Kartu Material Alokasi RAB vs Form Dropdown Ekstra pada Daftar Permintaan Material di Mandor)

**Gaps to Close:**
- [x] Logika Render Item di Kotak Kiri: Membedakan item statis (RAB/tersimpan/dipilih) sebagai kartu material tetap tebal dengan badge dan estimasi harga, vs formulir dropdown ekstra baru hanya saat "+ Add Item".
- [x] Hydration State & Re-ordering: Memuat master materials dan RAB items terlebih dahulu, lalu mencocokkan item requisition tersimpan ke RAB item dan menghitung subtotal secara akurat (`isManual: false`, `isPersisted: true`).
- [x] Verifikasi Type Checking, Build Validation (`npm run build`, `npx oxlint`), UI Check SPK-5902 Pembongkaran, dan Commit Atomik (`fix(mandor): properly render allocated rab material card instead of extra material select in requisition list`).

---

### Phase 57: Gap Closure (Refactor Seluruh Dialog Konfirmasi Native Browser Menjadi Modal Custom di /mandor)
**Status**: ✅ Complete
**Objective**: Address gaps from operational feedback (Mengganti seluruh dialog window.confirm dan window.alert native browser di modul Mandor menjadi komponen modal konfirmasi dan notifikasi custom berbasis React UI)

**Gaps to Close:**
- [x] Pembuatan komponen reusable `ConfirmationModal.tsx` dengan varian tema dark industrial RobelKaroseri (danger, warning, info, success) dan dukungan alert/konfirmasi.
- [x] Refactor pemanggilan `window.confirm` dan `window.alert` pada pembatalan penugasan SPK Borongan di `SpkBoronganPanel.tsx`.
- [x] Standarisasi dialog konfirmasi pembatalan/pengembalian material dan pesan notifikasi pada `MaterialRequisitionForm.tsx`.
- [x] Refactor pesan peringatan dan alert pada `WbsChecklist.tsx` dan `QcInspectionForm.tsx`.

---

### Phase 58: Gap Closure (Refactor Seluruh Dialog Konfirmasi Native Browser Menjadi Modal Custom di /warehouse)
**Status**: ✅ Complete
**Objective**: Address gaps from operational feedback (Mengganti seluruh dialog window.confirm dan window.alert native browser di modul Warehouse/Gudang menjadi modal dialog konfirmasi custom berbasis React UI)

**Gaps to Close:**
- [x] Refactor alur Approve & Reject permintaan material di `RequisitionApproval.tsx` menjadi state-driven modal dialog `ConfirmationModal`.
- [x] Refactor alur Void Transaksi Pengeluaran dan peringatan SPK COMPLETED di `RecentMaterialIssues.tsx` menjadi `ConfirmationModal`.
- [x] Refactor pesan notifikasi/alert di `GoodsIssueForm.tsx` dan `GoodsReturnForm.tsx` menjadi `ConfirmationModal`.
- [x] Standarisasi dialog modal hapus master material (single & bulk) di `InventoryManager.tsx` dan paket di `PackageManager.tsx` menggunakan `ConfirmationModal`.
- [x] Penyiapan skrip migrasi SQL jika status `CANCELLED` dibutuhkan pada `requisition_status` (`20261012000001_add_cancelled_to_requisition_status.sql`).

---

### Phase 59: Gap Closure (Refactor Seluruh Dialog Konfirmasi Native Browser Menjadi Modal Custom di /kasir)
**Status**: ✅ Complete
**Objective**: Address gaps from operational feedback (Mengganti seluruh dialog window.confirm dan window.alert native browser di modul Kasir / Billing menjadi modal dialog konfirmasi & notifikasi custom berbasis React UI)

**Gaps to Close:**
- [x] Refactor titik konfirmasi dan notifikasi pada `KasirDashboard.tsx`: Generate Final Bill (Invoice), Pelunasan (Mark as Paid), Pembatalan Invoice, Serah Terima Kendaraan (Release Vehicle & BAST), dan Salin Tautan Pelacakan menjadi `ConfirmationModal`.
- [x] Refactor form Penerimaan Uang Muka (DP) pada `DownPaymentModal.tsx` dengan konfirmasi aktivasi SPK dan modal notifikasi validasi/status custom.
- [x] Refactor aksi Cetak Kuitansi DP pada `DpHistoryList.tsx` menjadi modal konfirmasi cetak custom tanpa `window.alert`.
- [x] Standarisasi error handling unduhan PDF pada `BastModal.tsx` menggunakan modal notifikasi custom.
- [x] Penyiapan skrip migrasi SQL penambahan status `CANCELLED` pada tabel `invoices` (`supabase/migrations/20261012000002_add_cancelled_to_invoices_status.sql`).

---

### Phase 60: Gap Closure (Refactor Seluruh Dialog Konfirmasi Native Browser Menjadi Modal Custom di /service-advisor)
**Status**: ✅ Complete
**Objective**: Address gaps from operational feedback (Mengganti seluruh dialog window.confirm dan window.alert native browser di modul Service Advisor menjadi modal dialog konfirmasi & notifikasi custom berbasis React UI)

**Gaps to Close:**
- [x] Refactor titik konfirmasi penghapusan baris item bahan atau jasa pada tabel kalkulasi RAB (`RabCalculator.tsx`) menggunakan `ConfirmationModal`.
- [x] Refactor pemanggilan alert pada penyimpanan estimasi RAB (`RabCalculator.tsx`) dan penanganan error/sukses menjadi dialog modal custom (`hideCancel: true`).
- [x] Refactor dialog konfirmasi native penghapusan foto kendaraan dari galeri check-in (`SpkGalleryModal.tsx`) menjadi modal dialog konfirmasi custom.
- [x] Refactor aksi approval & rejection Change Orders (`AmendmentManager.tsx`) dengan modal dialog konfirmasi interaktif.
- [x] Verifikasi konsistensi tampilan modal dengan tema dark industrial RobelKaroseri dan pastikan tidak ada `window.confirm` / `window.alert`.

---

### Phase 61: Gap Closure (Refactor Seluruh Dialog Konfirmasi Native Browser Menjadi Modal Custom di /dashboard)
**Status**: ⬜ Ready for Review
**Objective**: Address gaps from operational feedback (Mengganti seluruh dialog window.confirm dan window.alert native browser di modul Dashboard Owner & Admin Portal menjadi modal dialog konfirmasi & notifikasi custom berbasis React UI)

**Gaps to Close:**
- [x] Refactor alur persetujuan (Approve) dan penolakan (Reject) Change Order / Amendment pada Pending Approvals modal di `AdminDashboardPage.tsx` menjadi state-driven modal dialog `ConfirmationModal` dengan feedback terintegrasi.
- [x] Implementasi fitur pembatalan SPK langsung oleh Owner pada tabel monitoring `AdminDashboardPage.tsx` menggunakan `ConfirmationModal` (`variant: 'danger'`) beserta input wajib alasan pembatalan (`cancellation_reason`) dan eksekusi mutasi ke Supabase via `spkService.cancelSpk`.
- [x] Implementasi bilah pencarian & filter analitik (Status SPK, pencarian nomor SPK/klien/nopol), tombol reset filter, dan tombol ekspor ringkasan laporan SPK ke format CSV dengan modal konfirmasi interaktif di `AdminDashboardPage.tsx`.
- [x] Refactor seluruh 5 titik pemanggilan native `alert(...)` di `AdminSettingsPage.tsx` (registrasi pengguna, penyimpanan konfigurasi bengkel) menjadi modal feedback dan notifikasi `ConfirmationModal`.
- [x] Penambahan fitur pengelolaan dan pembersihan akses staf (Aktifkan / Nonaktifkan status akun) di `AdminSettingsPage.tsx` dengan modal konfirmasi dialog custom.
- [x] Penambahan fitur Reset Parameter Bengkel ke Standar Pabrik di `AdminSettingsPage.tsx` dengan modal konfirmasi dialog `ConfirmationModal` (`variant: 'warning'`).
- [x] Refactor modal konfirmasi pemulihan basis data pada `BackupRestoreCard.tsx` dari raw div ad-hoc menjadi `ConfirmationModal` (`variant: 'danger'`).
- [x] Penyiapan skrip migrasi SQL penambahan kolom `is_active` pada tabel `profiles` (`supabase/migrations/20261012000003_add_is_active_to_profiles.sql`).

---

### Phase 62: Gap Closure (Transformasi Tampilan Raw JSON Audit Trail Menjadi Tabel Perubahan Diff dengan Paginasi di /service-advisor)
**Status**: ✅ Complete
**Objective**: Address gaps from operational feedback (Mengubah tampilan data mentah JSON pada Audit Trail di Service Advisor Portal menjadi tabel perbandingan perubahan data (Diff Table) yang informatif dan terpaginasi)

**Gaps to Close:**
- [x] Pembuatan modul parser diff nilai JSON `src/utils/auditDiffHelper.ts` dengan fungsi `renderAuditChanges` untuk mengekstrak perubahan parameter, label manusiawi, dan kalkulasi selisih.
- [x] Pembuatan komponen UI `AuditDiffTable.tsx` untuk menampilkan parameter sebelum, sesudah, dan badge perubahan bergaya dark theme industrial RobelKaroseri.
- [x] Integrasi `AuditDiffTable` dan pembaruan relasi nama material pada `SAInventoryPanel.tsx` menggantikan blok `<pre>` raw JSON.
- [x] Implementasi kontrol paginasi lengkap (`currentPage`, `pageSize`, indikator halaman, dan tombol navigasi) beserta filter/pencarian riwayat audit di `SAInventoryPanel.tsx`.
- [x] Memastikan pemenuhan batasan eksekusi: tanpa auto-verify, tanpa auto-commit, dan tanpa eksekusi langsung migrasi Supabase.

---

### Phase 63: Gap Closure (Implementasi Search Autocomplete Berbasis Keyboard untuk Pemilihan Return Material di /warehouse)
**Status**: ⬜ Ready for Review
**Objective**: Address gaps from operational feedback (Mengganti elemen dropdown native `<select>` pada pemilihan barang yang hendak dikembalikan di halaman `/warehouse` tab "Return Material" menjadi input text search autocomplete berbasis keyboard dengan popup saran melayang)

**Gaps to Close:**
- [x] Pembuatan komponen `IssuedMaterialAutocomplete.tsx` di `src/components/` dengan pencarian real-time case-insensitive, kontrol keyboard (`ArrowDown`, `ArrowUp`, `Enter`, `Escape`), dan pendeteksi klik luar area (click outside).
- [x] Styling dropdown saran melayang (floating list) konsisten dark mode RobelKaroseri (`bg-slate-900`, `border-slate-700`, highlight `bg-orange-500/20 text-orange-300`, dan badge info kuantitas yang dikeluarkan beserta satuannya).
- [x] Integrasi `IssuedMaterialAutocomplete` ke `GoodsReturnForm.tsx` untuk menggantikan `<select>` "Select Issued Material".
- [x] Sinkronisasi pemilihan material: auto-focus ke input "Return Quantity" saat menekan Enter atau memilih item, tampilan batas retur maksimum, dan reset otomatis saat pergantian SPK.
- [x] Memastikan kepatuhan terhadap batasan eksekusi: tanpa auto-verify, tanpa auto-commit, dan tanpa eksekusi langsung migrasi Supabase.

---

### Phase 64: Gap Closure (Implementasi Search Autocomplete Berbasis Keyboard untuk Pemilihan Goods Issue Material di /warehouse)
**Status**: ⬜ Ready for Review
**Objective**: Address gaps from operational feedback (Mengganti elemen dropdown native `<select>` pada pemilihan material di halaman `/warehouse` tab "Issue Material / Goods Issue" menjadi input text search autocomplete berbasis keyboard dengan popup saran melayang)

**Gaps to Close:**
- [x] Pembuatan komponen `MaterialSearchAutocomplete.tsx` di `src/components/` dengan pencarian real-time case-insensitive, kontrol keyboard penuh (`ArrowDown`, `ArrowUp`, `Enter`, `Escape`), auto-scroll list, dan click-outside handler.
- [x] Styling floating autocomplete list bergaya dark mode RobelKaroseri (`bg-slate-900`, `border-slate-700`, `shadow-2xl`, highlight `bg-orange-500/20 text-orange-300`, badge status RAB / Sudah Diambil, dan badge stok tersedia).
- [x] Integrasi `MaterialSearchAutocomplete` ke `GoodsIssueForm.tsx` menggantikan elemen native `<select>` "Select Material".
- [x] Integrasi sinkronisasi payload Goods Issue: pengisian `material_id` UUID asli, auto-focus ke input "Request Quantity" saat item dipilih, indikator visual satuan unit material di samping input kuantitas, dan reset state saat SPK berganti.
- [x] Memastikan kepatuhan terhadap batasan eksekusi: tanpa auto-verify, tanpa auto-commit, dan tanpa eksekusi langsung migrasi Supabase.

---

### Phase 65: Gap Closure (Sinkronisasi Tampilan Data Requisition Lintas Role dan Resolusi Pelanggaran RLS Minta Material untuk Service Advisor)
**Status**: ⬜ Ready for Review
**Objective**: Address gaps from operational feedback (Memperbarui RLS policy pada material_requisitions dan material_requisition_items untuk role service_advisor, serta menyinkronkan data fetching dan tampilan modal dual-list Requisition antara Service Advisor dan Mandor)

**Gaps to Close:**
- [x] Pembuatan skrip migrasi SQL `supabase/migrations/20261012_sync_requisitions_rls_for_service_advisor.sql` untuk memberikan hak SELECT, INSERT, UPDATE, dan DELETE pada tabel `material_requisitions` dan `material_requisition_items` bagi role `service_advisor`, `mandor`, `petugas_gudang`, `owner`, dan `admin` dengan dual-check (JWT claim dan profiles table).
- [x] Sinkronisasi kueri Supabase di `MaterialRequisitionForm.tsx` untuk mengambil seluruh permintaan aktif berdasarkan SPK dan WBS terkait tanpa membatasi akun pembuat, serta mengecualikan status CANCELLED dan REJECTED.
- [x] Pembaruan rendering kotak kiri "Daftar Permintaan Material" untuk menampilkan seluruh item tersimpan lengkap dengan nama, kuantitas, dan badge status `TERCATAT`.
- [x] Sinkronisasi filter panel kanan "Alokasi RAB (WBS Terkait)" untuk mengecualikan material yang sudah diajukan di requisition aktif atau ditugaskan di SPK Borongan, serta menampilkan pesan informatif saat semua material telah dipindahkan.
- [x] Penyesuaian payload submit agar selalu menyertakan `requested_by: auth.uid()` dan memetakan `material_id` UUID master material secara akurat.
- [x] Memastikan kepatuhan terhadap batasan eksekusi: tanpa auto-verify, tanpa auto-commit, dan tanpa eksekusi langsung migrasi Supabase.

---

### Phase 66: Gap Closure (Integrasi Tampilan Mandor Notes pada Kartu WBS di Portal Pelanggan /tracking/:spk_no)
**Status**: ⬜ Ready for Review
**Objective**: Address gaps from operational feedback (Menyimpan field mandor notes di /mandor dan menampilkannya dalam container catatan khusus yang rapi, profesional, dan informatif pada setiap kartu tahapan WBS di portal pelacakan pelanggan /tracking/:spk_no)

**Gaps to Close:**
- [x] Pembuatan skrip migrasi SQL `supabase/migrations/20261014140000_add_mandor_notes_to_wbs_checklists.sql` untuk menambahkan kolom `mandor_notes TEXT` pada tabel `public.wbs_checklists`, sinkronisasi data eksisting dari kolom `notes`, dan konfigurasi policy RLS public/anon `SELECT` untuk pelacakan SPK & WBS.
- [x] Pembaruan `WbsChecklist.tsx` di `/mandor`: Memastikan fetching membaca `mandor_notes` & `notes`, penyimpanan payload ke Supabase menyertakan `mandor_notes` dan `notes` dengan mekanisme retry defensif, serta shortcut tombol Enter untuk blur/save.
- [x] Integrasi UI di `PublicProgressTracking.tsx` (`/tracking/:spk_no`): Menampilkan container khusus Catatan Mandor beraksen oranye (`bg-slate-800/60`, `border-orange-500/30`, ikon `ClipboardList`) dengan badge "Catatan Mandor / Progres Terkini:" dan teks catatan mandor yang rapi, serta placeholder netral jika belum ada catatan khusus.
- [x] Memastikan kepatuhan terhadap batasan eksekusi: tanpa auto-verify, tanpa auto-commit, dan tanpa eksekusi langsung migrasi Supabase.

---

### Phase 67: Gap Closure (Indikator & Rincian Alokasi Material WBS Belum Diminta pada Header Kartu WBS di /service-advisor)
**Status**: ⬜ Ready for Review
**Objective**: Address gaps from operational feedback (Menampilkan status badge peringatan dini jumlah alokasi material RAB per tahapan WBS yang belum diajukan di Requisition maupun SPK Borongan, serta quick modal rincian material tertunda beserta tombol pintas ke form Requisition)

**Gaps to Close:**
- [x] Pembuatan komponen `WbsPendingMaterialModal.tsx` di `src/components/` untuk menampilkan modal rincian material yang belum diminta (tabel Nama Material, Qty Belum Diambil, Estimasi Biaya, total biaya tertunda, dan shortcut "Buka Minta Material").
- [x] Implementasi fungsi kalkulasi material terdistribusi vs tertunda di `WbsChecklist.tsx` menggunakan shared utility `isRabItemAllocated`, membandingkan `rab_items` terhadap `material_requisitions` aktif dan `spk_borongan` aktif.
- [x] Integrasi badge status interaktif pada baris header masing-masing WBS tepat di sebelah kiri tombol "SPK Borongan" (badge peringatan amber `[ ⚠️ {pendingCount} Material Belum Diminta ]`, badge hijau `[ ✓ Semua Material Terdistribusi ]`, atau badge netral jika belum ada RAB).
- [x] Pembaruan state dan auto-refresh kalkulasi saat modal Requisition atau Borongan ditutup.
- [x] Memastikan kepatuhan terhadap batasan eksekusi: tanpa auto-verify, tanpa auto-commit, dan tanpa eksekusi langsung migrasi Supabase.

---

### Phase 68: Gap Closure (Void Recent Material Issue Mengembalikan Permintaan ke Tab Mandor Requests dan Menyesuaikan Stok Material di /warehouse)
**Status**: ⬜ Ready for Review
**Objective**: Address gaps from operational feedback (Ketika transaksi Recent Material Issues di-void di /warehouse, stok dikembalikan, status permintaan pada material_requisitions dan itemnya dipulihkan menjadi PENDING, antrean dan counter tab Mandor Requests langsung tersinkronisasi, serta konfirmasi menggunakan ConfirmationModal dialog internal)

**Gaps to Close:**
- [x] Pembuatan skrip migrasi SQL `supabase/migrations/20261014_void_material_issue_rollback.sql` yang menambahkan relasi `requisition_id` dan `requisition_item_id` pada `inventory_transactions`, kolom `status` pada `material_requisition_items`, serta fungsi RPC atomik `public.void_material_issue(UUID)` dan `public.void_material_issues(UUID[])` dengan izin `GRANT EXECUTE TO authenticated`.
- [x] Pembaruan fungsi `deleteIssuesAndRevertStock` di `src/services/inventoryService.ts` untuk memanggil RPC `void_material_issues` / `void_material_issue` serta menyediakan mekanisme fallback client-side yang andal untuk mengembalikan stok material dan mengubah status requisition ke PENDING.
- [x] Standarisasi UI `ConfirmationModal` di `RecentMaterialIssues.tsx` dengan judul "Konfirmasi Void Pengeluaran Material", pesan konfirmasi pemulihan stok dan antrean permintaan mandor, tombol "Ya, Void Transaksi" (varian bahaya/merah), tombol per-baris aksi cepat void, serta notifikasi modal feedback sukses.
- [x] Integrasi sinkronisasi lintas komponen pada `WarehouseDashboard.tsx`: penambahan badge counter peringatan permintaan berstatus PENDING pada tab button "Mandor Requests", serta penyambungan callback `onSuccess` dari `RecentMaterialIssues` ke `refreshKey` dan `fetchPendingReqCount`.
- [x] Integrasi auto-refresh dan relasi transaksi di `RequisitionApproval.tsx`: mendengarkan `refreshKey` agar item yang di-void langsung muncul kembali di antrean approval, mencatat `requisition_id` dan `requisition_item_id` pada saat approve, serta mengurangi stok fisik `materials` saat material dikeluarkan.
- [x] Memastikan kepatuhan terhadap batasan eksekusi: tanpa auto-verify, tanpa auto-commit, dan tanpa eksekusi langsung migrasi Supabase.

---

### Phase 69: Gap Closure (Menambahkan Filter Pemilihan SPK pada Tab Mandor Requests di /warehouse)
**Status**: ⬜ Ready for Review
**Objective**: Address gaps from operational feedback (Menambahkan kontrol filter pills horizontal nomor SPK pada panel Pending Requisitions di tab Mandor Requests halaman /warehouse untuk mempermudah petugas gudang menyaring dan memprioritaskan pengeluaran barang per SPK)

**Gaps to Close:**
- [x] Pembuatan skrip migrasi SQL `supabase/migrations/20261014_add_requisition_filter_indexes.sql` yang menambahkan indeks komposit `idx_material_requisitions_spk_status` pada `material_requisitions(spk_id, status)` dan `idx_material_requisition_items_req_status` pada `material_requisition_items(requisition_id, status)`.
- [x] Penambahan state `selectedSpkFilter` dan komputasi reaktif `spkSummary` serta `filteredRequisitions` di `src/components/RequisitionApproval.tsx`.
- [x] Integrasi visual filter pills horizontal di baris header panel "Pending Requisitions (Mandor)" dengan highlight aksen oranye RobelKaroseri, ringkasan jumlah per-SPK, dan opsi "Semua SPK".
- [x] Penambahan penanganan empty state ramah saat SPK yang dipilih tidak memiliki permintaan pending lagi beserta tombol cepat reset filter.
- [x] Memastikan badge counter total antrean pada tab "Mandor Requests" di `WarehouseDashboard.tsx` tetap konsisten mencerminkan seluruh beban kerja pending.
- [x] Memastikan kepatuhan terhadap batasan eksekusi: tanpa auto-verify, tanpa auto-commit, dan tanpa eksekusi langsung migrasi Supabase.

---

### Phase 70: Gap Closure (Refactor Filter SPK Menjadi List Box Vertikal di Sidebar Kanan Gudang pada /warehouse)
**Status**: ⬜ Ready for Review
**Objective**: Address gaps from operational feedback (Memindahkan filter pills horizontal dari header tabel yang sempit menjadi kartu List Box vertikal di sidebar kanan saat tab Mandor Requests aktif, lengkap dengan nomor SPK, nama pelanggan/unit, dan badge counter pending)

**Gaps to Close:**
- [x] Pembuatan komponen `src/components/SpkFilterListBox.tsx` untuk menyajikan list box vertikal interaktif kartu SPK (Nomor SPK, Nama Pelanggan, badge jumlah pending, opsi Semua SPK, container scrollable, dan highlight oranye aktif).
- [x] Pembersihan baris header panel "Pending Requisitions (Mandor)" di `src/components/RequisitionApproval.tsx` dari elemen filter pills horizontal, mengembalikannya ke tampilan bersih (Icon, Judul, dan Total Badge), serta integrasi penanganan empty state dan reset filter.
- [x] Integrasi sidebar kanan di `src/pages/WarehouseDashboard.tsx` untuk menampilkan `SpkFilterListBox` tepat di atas widget Low Stock Warnings ketika tab Mandor Requests aktif.
- [x] Penyelarasan reaktivitas dua arah: klik pada kartu SPK di sidebar kanan langsung menyaring daftar antrean kartu requisition di panel kiri tanpa re-fetch data database berulang.
- [x] Memastikan kepatuhan terhadap batasan eksekusi: tanpa auto-verify, tanpa auto-commit, dan tanpa eksekusi langsung migrasi Supabase.