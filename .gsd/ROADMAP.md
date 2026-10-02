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
