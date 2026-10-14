---
phase: 67
plan: fix-wbs-unallocated-materials-indicator
wave: 1
gap_closure: true
---

# Fix: Menampilkan Indikator & Rincian Alokasi Material WBS yang Belum Diminta/Dipakai pada Header Kartu WBS di /service-advisor

## Problem
1. Ketiadaan Indikator Peringatan Dini (Early Warning) Material WBS:
   Pada halaman `/service-advisor` tab "WBS & QC", Service Advisor mengelola tahapan pengerjaan unit karoseri. Seringkali terdapat item material pada estimasi RAB yang terlewat dan belum diajukan ke gudang (belum masuk Material Requisition) serta belum ditugaskan ke pekerja borongan (belum masuk SPK Borongan). Saat ini, tidak ada indikator visual di baris header tahapan WBS yang memberi tahu berapa banyak material yang masih tertunda (pending).
2. Kesulitan Memantau Sisa Alokasi Material sebelum QC:
   Service Advisor harus membuka modal "Minta Material" atau "SPK Borongan" satu per satu untuk mengecek apakah masih ada material RAB yang belum dialokasikan, yang memperlambat verifikasi dan meningkatkan risiko unit selesai dikerjakan tanpa pengeluaran material yang sesuai RAB.

## Root Cause
1. Komponen `WbsChecklist.tsx` sebelumnya hanya memiliki tombol aksi "SPK Borongan" dan "Minta Material" pada header kartu tahapan WBS tanpa menampilkan ringkasan status alokasi material RAB.
2. Belum ada kalkulasi terpadu di tingkat kartu WBS yang membandingkan `rab_items` terhadap `material_requisitions` aktif dan `spk_borongan` aktif per kategori WBS menggunakan shared utility `isRabItemAllocated`.
3. Belum ada popover / quick modal interaktif yang menampilkan rincian nama material yang tertunda, kuantitas RAB yang belum diminta, serta estimasi biayanya beserta shortcut cepat menuju form Requisition.

## Tasks

<task type="auto">
  <name>Task 1: Pembuatan Komponen WbsPendingMaterialModal.tsx</name>
  <files>src/components/WbsPendingMaterialModal.tsx</files>
  <action>
    - Buat modal dialog / quick popover interaktif bergaya dark industrial RobelKaroseri.
    - Tampilkan judul tahapan WBS, total item tertunda, dan estimasi biaya tertunda.
    - Sajikan tabel ringkas berisi kolom: `Nama Material`, `Qty Belum Diambil`, dan `Estimasi Biaya`.
    - Sediakan tombol pintas cepat "Buka Minta Material" untuk langsung menutup popover dan membuka form Requisition WBS terkait.
    - Pastikan interaksi penutupan modal responsif (tombol X, tombol Tutup, klik backdrop, dan tombol Escape).
  </action>
  <verify>Komponen me-render tabel rincian material tertunda dengan format kuantitas dan mata uang Rupiah yang presisi.</verify>
  <done>Komponen WbsPendingMaterialModal berhasil dibuat.</done>
</task>

<task type="auto">
  <name>Task 2: State Binding & Kalkulasi Material Belum Diminta di WbsChecklist.tsx</name>
  <files>src/components/WbsChecklist.tsx</files>
  <action>
    - Import utility `isRabItemAllocated` dari `src/utils/rabItemAllocation.ts`.
    - Tambahkan fungsi kalkulasi `fetchMaterialAllocations` yang mengambil `rab_items`, `material_requisitions` (non-CANCELLED, non-REJECTED), dan `spk_borongan` (non-CUT_OFF, non-CANCELLED) untuk SPK aktif.
    - Hitung daftar material tertunda (`pendingMaterials`), jumlah tertunda (`pendingCount`), dan total estimasi biaya per kategori WBS.
    - Picu pembaruan kalkulasi saat SPK dimuat serta saat modal Requisition atau Borongan ditutup.
    - Tempatkan status badge interaktif di baris header masing-masing WBS tepat di sebelah kiri tombol "SPK Borongan":
      * Jika `pendingCount > 0`: Badge amber/orange `[ ⚠️ {pendingCount} Material Belum Diminta ]` (cursor-pointer).
      * Jika `pendingCount === 0` dan ada RAB: Badge hijau `[ ✓ Semua Material Terdistribusi ]`.
      * Jika belum ada RAB: Badge minimalis `[ Belum Ada RAB ]`.
    - Hubungkan klik badge peringatan untuk membuka `WbsPendingMaterialModal`.
    - Pastikan layout tombol header rapi dan responsif pada mobile, tablet, maupun desktop (`flex flex-wrap md:flex-nowrap items-center gap-2`).
  </action>
  <verify>Badge indikator muncul di header kartu WBS, menampilkan jumlah material yang belum diminta, dan popover terbuka saat badge diklik.</verify>
  <done>Integrasi badge dan modal rincian material WBS selesai dan berfungsi optimal.</done>
</task>
