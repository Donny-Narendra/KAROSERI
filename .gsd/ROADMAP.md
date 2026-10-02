# RobelKaroseri Management System - ROADMAP

> Milestone 1 completed. Awaiting next milestone planning.

---

### Phase 1: Pengaturan Sistem & Manajemen Pengguna
**Status**: ⬜ Not Started
**Objective**: Implementasikan modul Workshop Settings & User Management khusus untuk hak akses 'owner'. Memungkinkan owner untuk mengatur profil pengguna dan konfigurasi bengkel.
**Depends on**: Milestone 1

**Tasks**:
- [x] Buat file migrasi database untuk tabel `workshop_settings` dan perbarui RLS.
- [x] Buat komponen UI (Halaman Pengaturan Bengkel) dengan React dan Tailwind CSS, menggunakan lucide-react.
- [x] Konfigurasi routing untuk `/admin/settings` khusus role `owner`.

**Verification**:
- [x] TypeScript build/lint passed.
- [x] UI sesuai requirement.
