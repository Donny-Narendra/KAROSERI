---
phase: 18
plan: fix-alokasi-parsial
wave: 1
gap_closure: true
---

# Fix: Buka kunci tombol Terapkan ke RAB untuk alokasi parsial di PackageAllocationModal

## Problem
Tombol "Terapkan ke RAB" saat ini dikunci mati (disabled) jika seluruh kuota material belum dialokasikan 100% (sisa = 0). Secara praktis, Service Advisor perlu menyimpan alokasi sementara (parsial) sembari menghitung kebutuhan teknis di lapangan.

## Root Cause
Validasi modal mengharuskan semua sisa dialokasikan 100% (allRemainingZero). Jika ada sisa, tombol disabled.

## Tasks

<task type="auto">
  <name>Buka kunci tombol Terapkan ke RAB untuk alokasi parsial di PackageAllocationModal</name>
  <files>src/components/PackageAllocationModal.tsx, src/components/RabCalculator.tsx</files>
  <action>
    1. Di `PackageAllocationModal.tsx`:
       - Perbarui logika disabled pada tombol "Terapkan ke RAB":
         Izinkan submit jika tidak ada item yang bernilai sisa < 0 (over-allocated).
       - Ubah teks peringatan di bawah form: jika masih ada sisa > 0, tampilkan pesan informatif berwarna oranye:
         "Perhatian: Paket akan disimpan sebagai Draf Parsial dan belum dapat ditagihkan ke Kasir sampai alokasi tuntas."
       - Kirimkan flag kelengkapan (`isComplete = allSisaZero`) bersama payload alokasi saat tombol diklik.
    2. Di `RabCalculator.tsx`:
       - Tangani penyimpanan baris material WBS dari alokasi parsial.
       - Tampilkan penanda visual/badge pada ringkasan paket di RAB: "Alokasi Sebagian (Perlu Dilengkapi)" jika belum tuntas.
  </action>
  <verify>Jalankan oxlint / npm run build, buka modal alokasi paket, isi sebagian kuota baut, pastikan tombol "Terapkan ke RAB" aktif dan dapat diklik untuk menyimpan ke tabel RAB.</verify>
  <done>Service Advisor dapat mencicil alokasi material ke WBS tanpa terhalang tombol disabled.</done>
</task>
