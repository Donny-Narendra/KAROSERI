---
phase: 5
plan: 1
wave: 1
---

# Plan 5.1: Integrasi Mandor Terminal

## Objective
Mengimplementasikan fetching Active SPK dan integrasi penuh form WBS & QC pada Mandor Terminal sesuai dengan PRD (Gap Analysis Wave 4).

## Context
- .gsd/SPEC.md
- src/pages/MandorDashboard.tsx
- src/components/WbsChecklist.tsx
- src/components/QcInspectionForm.tsx

## Tasks

<task type="auto">
  <name>Koneksikan fetching SPK aktif dan state selector di Mandor Terminal</name>
  <files>src/pages/MandorDashboard.tsx, src/services/mandorService.ts</files>
  <action>
    1. Buat helper query Supabase untuk mengambil daftar SPK dengan status 'active' (jika belum ada `mandorService.ts`, buat file ini atau masukkan logika query di dalam `MandorDashboard.tsx`).
    2. Render dropdown / selector card pada area "Select Active SPK".
    3. Simpan selectedSpkId ke state dan teruskan ke komponen WbsChecklist dan QcInspectionForm.
  </action>
  <verify>Jalankan linter (`npx oxlint` / `npm run build`), periksa apakah typescript logic di MandorDashboard bebas error.</verify>
  <done>Mandor dapat memilih SPK aktif yang sedang dikerjakan di lantai bengkel secara responsif.</done>
</task>

<task type="auto">
  <name>Aktifkan integrasi riil Supabase pada WbsChecklist dan QcInspectionForm</name>
  <files>src/components/WbsChecklist.tsx, src/components/QcInspectionForm.tsx</files>
  <action>
    1. Uncomment dan perbaiki query fetching serta upsert mutasi di WbsChecklist.tsx agar terikat pada selectedSpkId.
    2. Hubungkan tombol submit di QcInspectionForm.tsx ke tabel Supabase `qc_inspections` (hapus mock console.log).
    3. Tambahkan visual indicator jika tahapan WBS dan QC sudah 'Pass' di komponen masing-masing jika relevan.
  </action>
  <verify>Jalankan linter (`npx oxlint` / `npm run build`), pastikan komponen WBS dan QC di Mandor Dashboard bisa di-compile tanpa error tipe data.</verify>
  <done>Taskboard WBS dan QC Mandor berfungsi secara interaktif dan real-time langsung masuk database.</done>
</task>

## Success Criteria
- [ ] Active SPK list dapat difetch secara dinamis
- [ ] Pemilihan SPK memperbarui UI WBS dan QC
- [ ] Form WBS checklist menyimpan data aktual
- [ ] Form QC inspection menyimpan data aktual ke tabel `qc_inspections`
