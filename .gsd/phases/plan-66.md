---
phase: 66
plan: fix-mandor-notes-tracking-display
wave: 1
gap_closure: true
---

# Fix: Menampilkan Mandor Notes pada Setiap Kartu Tahapan WBS di Halaman Portal Pelanggan (/tracking/:spk_no)

## Problem
1. Catatan Mandor Tidak Terintegrasi Optimal di Portal Pelanggan:
   Di halaman `/mandor`, mandor memasukkan catatan lapangan ("Mandor notes (optional)...") pada setiap kartu tahapan WBS untuk mencatat status progres terkini, kendala teknis, atau catatan fabrikasi. Namun di portal tracking pelanggan (`/tracking/:spk_no`), catatan ini belum disajikan dalam container informasi yang representatif, profesional, dan menonjol.
2. Standarisasi Kolom Basis Data dan Kompatibilitas Skema:
   Tabel `wbs_checklists` sebelumnya menggunakan kolom `notes`. Diperlukan penambahan kolom `mandor_notes` secara formal di basis data beserta sinkronisasi data eksisting, serta jaminan bahwa kueri frontend tetap toleran dan kompatibel (backward & forward compatible) terhadap kolom `notes` maupun `mandor_notes`.
3. Hak Akses Publik (RLS):
   Pelanggan yang mengakses halaman pelacakan publik secara anonim membutuhkan akses `SELECT` tanpa batas pada catatan progres tahapan WBS (`wbs_checklists`) agar seluruh catatan mandor dapat terbaca tanpa terhalang RLS.

## Root Cause
1. Frontend `PublicProgressTracking.tsx` sebelumnya hanya menampilkan teks catatan kecil italic jika `data?.notes` ada, belum dilengkapi container khusus dengan styling modern dark theme, aksen oranye RobelKaroseri, ikon catatan lapangan, dan placeholder netral informatif jika mandor belum mengisi catatan.
2. Skema basis data pada tabel `wbs_checklists` memerlukan DDL migrasi resmi untuk menambahkan kolom `mandor_notes TEXT` dan menyinkronkan data lama dari `notes`.
3. Di `WbsChecklist.tsx`, mekanisme penyimpanan perlu mendukung field `mandor_notes` dan `notes` secara bersamaan, serta memiliki mekanisme fallback defensif jika migrasi basis data belum dieksekusi oleh pengguna.

## Tasks

<task type="auto">
  <name>Task 1: Pembuatan File Migrasi SQL mandor_notes dan Public Tracking RLS</name>
  <files>supabase/migrations/20261014140000_add_mandor_notes_to_wbs_checklists.sql</files>
  <action>
    - Buat skrip DDL migrasi SQL untuk menambahkan kolom `mandor_notes TEXT` pada tabel `public.wbs_checklists` jika belum ada.
    - Sinkronkan data lama dari `notes` ke `mandor_notes` untuk record yang sudah tersimpan sebelumnya.
    - Buat policy RLS `Allow public read wbs_checklists for tracking` yang mengizinkan role anon dan authenticated melakukan SELECT tanpa hambatan pada `wbs_checklists`.
  </action>
  <verify>File migrasi SQL tersimpan rapi di direktori `supabase/migrations/` dan siap dieksekusi secara manual oleh pengguna di Supabase SQL Editor.</verify>
  <done>Skrip migrasi SQL berhasil dibuat sesuai spesifikasi.</done>
</task>

<task type="auto">
  <name>Task 2: Integrasi Penyimpanan Mandor Notes di WbsChecklist.tsx</name>
  <files>src/components/WbsChecklist.tsx</files>
  <action>
    - Pastikan fetch kueri Supabase mengambil kolom `mandor_notes` dan `notes` (menggunakan `.select('*')`).
    - Inisialisasi state catatan mandor dengan memprioritaskan `item.mandor_notes || item.notes`.
    - Perbarui fungsi `saveWbsData` agar menyimpan payload `mandor_notes` dan `notes` secara sinkron, dilengkapi mekanisme fallback retry jika kolom `mandor_notes` belum aktif di DB Supabase.
    - Tambahkan handler `onKeyDown` (Enter blur) pada input field "Mandor notes (optional)..." untuk kenyamanan input mandor di tablet shopfloor.
  </action>
  <verify>Penyimpanan catatan mandor tersimpan dengan benar ke Supabase baik saat blur, tekan Enter, maupun saat perubahan progres / QC status.</verify>
  <done>Integrasi penyimpanan Mandor Notes di `/mandor` selesai dan stabil.</done>
</task>

<task type="auto">
  <name>Task 3: Desain Tampilan Container Mandor Notes di PublicProgressTracking.tsx</name>
  <files>src/pages/PublicProgressTracking.tsx</files>
  <action>
    - Periksa pengambilan data WBS agar membaca `mandor_notes` dan `notes` (`data?.mandor_notes || data?.notes`).
    - Buat container UI catatan mandor pada setiap kartu tahapan WBS:
      - Jika ada catatan: Tampilkan container aksen informatif dengan latar `bg-slate-800/60`, border `border-orange-500/30`, badge/header dengan ikon `ClipboardList` dan teks "Catatan Mandor / Progres Terkini:", serta teks isi catatan yang jelas dan mudah dibaca (dengan dukungan print preview).
      - Jika tidak ada catatan: Tampilkan placeholder netral informatif ("Pengerjaan berjalan sesuai standar, belum ada catatan khusus.").
  </action>
  <verify>Komponen kartu tahapan WBS di `/tracking/:spk_no` menampilkan container Catatan Mandor secara estetis dan responsif.</verify>
  <done>UI Mandor Notes terintegrasi sempurna di portal pelacakan pelanggan.</done>
</task>
