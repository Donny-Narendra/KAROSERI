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
**Status**: ⬜ Not Started
**Objective**: Mengeksekusi Wave 1 dari Gap Analysis untuk SPK dan RAB.
**Depends on**: Phase 1

**Tasks**:
- [ ] Penambahan field VIN/Sasis dan Nomor Mesin pada `SpkForm` dan tabel `spk`.
- [ ] Koneksi `RabCalculator` ke backend agar Estimasi RAB benar-benar tersimpan ke DB (`rab_estimations` & `rab_items`).
- [ ] Integrasi Kalkulasi *Time-Based Overhead* di RAB berdasarkan `workshop_settings`.

**Verification**:
- [ ] Database schema untuk SPK dan RAB diperbarui.
- [ ] Input di UI masuk ke backend Supabase dengan benar.
