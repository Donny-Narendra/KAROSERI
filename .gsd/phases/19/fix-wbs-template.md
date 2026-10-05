---
phase: 19
plan: fix-wbs-template
wave: 1
gap_closure: true
---

# Fix: Simpan & Terapkan Pembagian WBS Bawaan pada Paket BOM

## Problem
Saat ini Service Advisor harus membagi jatah kuota komponen paket (seperti BAUT 10) ke WBS 1 s/d WBS 5 secara manual dari awal setiap kali memilih paket BOM. Hal ini memakan waktu dan rentan salah.

## Root Cause
Sistem belum memiliki kapabilitas menyimpan preferensi atau template alokasi (default_wbs_allocation) per item di dalam paket BOM.

## Tasks

<task type="auto">
  <name>Tambahkan skema database untuk default_wbs_allocation pada package_items</name>
  <files>supabase/migrations/</files>
  <action>
    1. Buat file migrasi SQL baru untuk tabel `package_items`.
    2. Tambahkan kolom JSONB `default_wbs_allocation` dengan default value '{"WBS 1": 0, "WBS 2": 0, "WBS 3": 0, "WBS 4": 0, "WBS 5": 0}'.
  </action>
  <verify>Jalankan script migrasi dan pastikan tabel package_items memiliki kolom default_wbs_allocation bertipe jsonb.</verify>
  <done>Kolom database telah tersedia untuk menyimpan data alokasi bawaan.</done>
</task>

<task type="auto">
  <name>Implementasi UI & Service Pembagian WBS Bawaan</name>
  <files>src/types/package.ts, src/services/packageService.ts, src/components/PackageAllocationModal.tsx</files>
  <action>
    1. Di `package.ts`: Tambahkan `default_wbs_allocation?: Record<string, number>` ke interface tipe terkait package item.
    2. Di `packageService.ts`: 
       - Pastikan service mengambil kolom `default_wbs_allocation` dari `package_items`.
       - Tambahkan metode atau update method `updatePackageItemDefaultAllocation(itemId, allocation)` untuk menyimpan perubahan.
    3. Di `PackageAllocationModal.tsx`:
       - Tambahkan checkbox di kiri bawah (samping Batal/Terapkan): "Simpan alokasi WBS ini sebagai template bawaan paket".
       - Saat modal dibuka dan `existingItems` kosong (paket baru dipilih), jika `default_wbs_allocation` ada, prefill form input WBS dengan proporsi yang tersimpan.
       - Jika checkbox dicentang saat mengklik "Terapkan ke RAB", kirim data alokasi tersebut ke `packageService` untuk disimpan (bisa disalurkan lewat props ke parent komponen atau di-handle via service call langsung di modal/parent).
  </action>
  <verify>Jalankan oxlint / npm run build, tes pilih paket, alokasikan dan centang 'Simpan sebagai template'. Pilih lagi paket yang sama dan pastikan alokasinya ter-prefill.</verify>
  <done>Service Advisor dapat memuat dan menyimpan template alokasi paket BOM secara otomatis.</done>
</task>
