---
phase: 39
plan: fix-login-guard-and-idle-timeout
wave: 4
gap_closure: true
---

# Fix: Keamanan Navigasi Login & Idle Session Timeout

## Problem
Pengguna yang sudah login masih bisa mengakses form login (misal via tombol Back browser atau URL langsung). Tidak ada perlindungan idle timeout (jika ditinggal lama, sesi tetap aktif sehingga berisiko).

## Root Cause
- Halaman `/login` belum dilindungi oleh `GuestRoute` guard yang mengecek session aktif dan me-redirect sesuai role.
- Fungsi navigasi pasca-login tidak menggunakan `replace: true`, sehingga riwayat halaman form login masih tertinggal di browser stack.
- Belum ada listener aktivitas `useIdleTimer` di root aplikasi untuk mendeteksi ketiadaan interaksi pengguna.

## Tasks

<task type="auto">
  <name>Fix Keamanan Navigasi Login & Auto Idle Timeout</name>
  <files>src/components/auth/GuestRoute.tsx, src/App.tsx, src/pages/Login.tsx, src/hooks/useIdleTimer.ts</files>
  <action>
    1. Buat komponen `GuestRoute` (misal di `src/components/auth/` atau `src/routes/`) yang mengecek status auth (`user` / `session`). Jika aktif, redirect ke rute dashboard rolenya masing-masing menggunakan `{ replace: true }`.
    2. Lindungi rute `/login` dan root `/` di `App.tsx` menggunakan `GuestRoute` jika mereka merupakan public route.
    3. Perbarui `src/pages/Login.tsx` pada proses redirect post-login menggunakan opsi `{ replace: true }` dari react-router.
    4. Implementasikan custom hook `useIdleTimer` yang mendeteksi event (`mousemove`, `keydown`, `click`, `scroll`, `touchstart`) dengan timeout (misal 15-30 menit). Saat idle tercapai, eksekusi `supabase.auth.signOut()` dan redirect ke halaman login dengan pesan notifikasi ("Sesi Anda telah berakhir...").
    5. Pasang hook `useIdleTimer` di level layout teratas (seperti `ProtectedRoute` atau `App.tsx`).
  </action>
  <verify>
    Skenario pengujian:
    - Login sukses, tekan "Back" di browser -> Tetap di halaman dashboard role terkait, tidak me-render form login.
    - Buka URL `/login` di tab baru saat sesi aktif -> Langsung dialihkan ke dashboard role terkait.
    - Biarkan aplikasi tanpa aktivitas (mouse, keyboard, scroll) selama 15 menit -> Otomatis terlogout dan dialihkan ke `/login`.
    - `npm run build` dan `npx oxlint` berhasil (clean build).
  </verify>
  <done>
    Semua navigasi auth berjalan aman dan auto idle timeout berfungsi.
  </done>
</task>
