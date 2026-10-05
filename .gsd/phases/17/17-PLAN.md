---
phase: 17
plan: fix-package-allocation-edit
wave: 1
gap_closure: true
---

# Fix: Edit Alokasi Paket BOM & Tracking Jatah Kuota Terpakai di RAB Calculator

## Problem
Komponen material sudah pernah dialokasikan penuh ke WBS 1 s/d WBS 5 dan masuk ke tabel RAB, namun tidak ada mekanisme untuk mengedit paket yang sudah dialokasikan. Saat user membuka kembali alokasi, input WBS 1..5 kembali kosong dan item bisa ditambahkan berulang kali (duplikasi jatah).

## Root Cause
Tidak ada state yang menyimpan package_id dan detail alokasi yang sudah ditambahkan ke `rab_items` sebelumnya di dalam `RabCalculator.tsx`. Modal alokasi selalu terbuka dengan state kosong.

## Tasks

<task type="auto">
  <name>Tambahkan state tracking paket BOM dan mode edit alokasi di RabCalculator</name>
  <files>src/components/PackageAllocationModal.tsx, src/components/RabCalculator.tsx, src/types/spk.ts</files>
  <action>
    1. Perbarui tipe `RabItem` agar mendukung properti opsional `package_id?: string` untuk melacak item yang berasal dari paket BOM.
    2. Di `RabCalculator.tsx`:
       - Simpan daftar paket yang sudah diterapkan (`appliedPackages: { packageId: string; allocations: Record<string, number[]> }`).
       - Tampilkan badge/tombol "Edit Alokasi" pada ringkasan paket BOM yang sudah masuk ke RAB.
       - Cegah penambahan duplikat untuk paket yang sama kecuali user memilih mode edit.
    3. Di `PackageAllocationModal.tsx`:
       - Tambahkan prop `initialAllocations?: Record<string, string[]>`.
       - Jika `initialAllocations` tersedia, inisialisasi state input WBS 1..5 dengan nilai tersebut sehingga sisa kuota langsung bernilai 0 (PASSED) dan input lama terlihat.
       - Saat user menekan "Perbarui RAB", kirim payload baru dan gantikan item lama di RAB yang memiliki `package_id` yang sama.
  </action>
  <verify>Jalankan oxlint / npm run build, pastikan build berhasil.</verify>
  <done>User dapat melihat input alokasi sebelumnya, jatah kuota terkunci tanpa duplikasi, dan alokasi paket dapat diedit secara konsisten.</done>
</task>
