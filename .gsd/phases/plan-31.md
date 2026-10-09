---
phase: 31
plan: wbs-access-rights
wave: 1
gap_closure: true
---

# Fix: Hak Akses Edit Laporan Pengerjaan WBS & Galeri Foto untuk Owner dan Service Advisor

## Problem
Saat ini pembaruan progres WBS dan dokumentasi foto lapangan difokuskan pada peran Mandor saja. Owner dan Service Advisor (SA) tidak dapat mengedit checklist, progres, maupun mengelola galeri foto pengerjaan, padahal mereka membutuhkan akses ini untuk tujuan Quality Control (QC).

## Root Cause
RLS di Supabase kemungkinan membatasi modifikasi tabel `wbs_checklists` dan `spk_assets` ke role Mandor. Selain itu, UI komponen frontend mungkin hanya mengekspos fitur ini ke role Mandor atau tidak menampilkan form ke SA dan Owner.

## Tasks

<task type="auto">
  <name>Sesuaikan RLS wbs_checklists dan spk_assets</name>
  <files>supabase/migrations/</files>
  <action>Periksa dan perbarui kebijakan RLS (Row Level Security) untuk tabel wbs_checklists dan spk_assets agar memperbolehkan role owner dan service_advisor melakukan UPDATE dan DELETE (serta INSERT untuk foto). Buat migration file baru untuk menyesuaikan RLS ini.</action>
  <verify>RLS policies untuk owner dan service_advisor terbuat.</verify>
  <done>RLS policies berhasil disesuaikan di Supabase.</done>
</task>

<task type="auto">
  <name>Sediakan Komponen UI untuk SA dan Owner</name>
  <files>src/components/ WbsChecklist.tsx, src/pages/</files>
  <action>Pastikan `WbsChecklist.tsx` atau komponen modal dapat diakses dan merender fungsionalitas edit checklist dan galeri WBS bagi SA dan Owner (mungkin menggunakan `useAuth` atau props role). Hubungkan integrasi QC sehingga saat revisi progres WBS, status real-time terupdate.</action>
  <verify>Komponen WBS checklist & galeri dapat diakses dan diperbarui oleh owner/SA tanpa diblokir UI.</verify>
  <done>UI dan sinkronisasi QC terimplementasi, build dan linter lulus.</done>
</task>

<task type="auto">
  <name>Rekam Jejak Audit Uploader Foto</name>
  <files>src/components/ WbsGallery.tsx</files>
  <action>Pastikan ketika mengupload foto melalui komponen, record `uploaded_by` (atau metadata sejenis) menyimpan user ID yang mengunggah foto beserta timestamp untuk membedakan unggahan dari Mandor, SA, atau Owner.</action>
  <verify>Upload foto mencatat siapa yang mengupload.</verify>
  <done>Audit log terimplementasi pada unggahan WBS.</done>
</task>
