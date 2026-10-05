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