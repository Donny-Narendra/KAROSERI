---
phase: 75
plan: fix-pending-requisitions-items-detail-warehouse
wave: 1
gap_closure: true
---

# Gap Closure: Bugfix UI & Data Fetch: Menampilkan Rincian Nama, Jumlah Satuan, dan Estimasi Harga Material pada Kartu "Pending Requisitions (Mandor)" di /warehouse

## Problem
1. Pada halaman `/warehouse` tab "Mandor Requests", kartu daftar antrean permintaan material ("Pending Requisitions (Mandor)") saat ini hanya menampilkan header tabel "MATERIAL" dan "REQUESTED QTY" yang kosong tanpa baris data item belanja.
2. Kartu disertai kotak peringatan:
   *"Note: Approving this requisition will bypass Gate 2 (RAB vs Actual) limit checks for now. Make sure the requested amount is within budget."*
3. Petugas gudang tidak dapat memeriksa material apa yang diminta mandor, berapa jumlahnya, dan berapa estimasi harganya karena baris item tidak ter-render serta tidak ada informasi harga satuan dan subtotal untuk memverifikasi pagu Gate 2 (RAB vs Aktual).

## Root Cause
1. Kueri `supabase.from('material_requisitions').select(...)` di `RequisitionApproval.tsx` tidak melakukan eager join terhadap harga satuan (`unit_price`) pada relasi `materials`.
2. Penanganan struktur data detail item (`material_requisition_items` vs `items`, `materials` vs `material`) belum memiliki normalisasi defensif sehingga rentan kosong saat di-render.
3. Tabel rincian material pada kartu requisition belum memiliki kolom estimasi harga satuan (`ESTIMASI HARGA (RP)`), subtotal (`SUBTOTAL (RP)`), dan footer total akumulasi biaya requisition per SPK.
4. Kotak catatan peringatan Gate 2 belum mengintegrasikan nominal riil akumulasi nilai belanja permintaan tersebut.

## Tasks

<task type="auto">
  <name>Task 1: Pembuatan Skrip SQL Migrasi Penyelarasan Kolom unit_price pada material_requisition_items</name>
  <files>supabase/migrations/20261014_add_unit_price_to_material_requisition_items.sql</files>
  <action>
    - Buat skrip migrasi `supabase/migrations/20261014_add_unit_price_to_material_requisition_items.sql`.
    - Tambahkan kolom `unit_price NUMERIC(15, 2) DEFAULT 0` pada tabel `material_requisition_items` (jika belum ada).
    - Berikan kueri backfill nilai `unit_price` dari master `materials` untuk baris item yang sudah tersimpan sebelumnya.
    - Simpan skrip untuk dieksekusi secara manual oleh pengguna di SQL Editor Supabase (tanpa eksekusi otomatis).
  </action>
  <verify>Berkas migrasi SQL tersimpan di direktori supabase/migrations/ dan siap dijalankan manual di Supabase.</verify>
  <done>Skrip migrasi database disiapkan sesuai batasan eksekusi pengguna.</done>
</task>

<task type="auto">
  <name>Task 2: Perbaikan Eager Query & Normalisasi Defensif Data Requisition di RequisitionApproval.tsx</name>
  <files>src/components/RequisitionApproval.tsx</files>
  <action>
    - Perbaiki kueri `supabase.from('material_requisitions').select(...)`:
      * Sertakan eager join relasi master material: `materials ( id, name, unit, unit_price )`.
      * Sertakan relasi `spk ( id, spk_no, customer_name )` dan profil pemohon.
    - Tambahkan pipeline normalisasi data sebelum disimpan ke state `requisitions`:
      * Petakan relasi item ke `material` dan `materials` secara defensif.
      * Resolusi nama material (`item.material_name || mat?.name || 'Material Non-Stok'`).
      * Resolusi satuan unit (`item.unit || mat?.unit || 'pcs'`).
      * Resolusi harga satuan (`mat?.unit_price || item.unit_price || 0`).
      * Hitung `subtotal = quantity * unitPrice`.
      * Hitung `totalRequisitionCost = sum(subtotal)` per kartu requisition.
      * Petakan `spk_no` dan `spk_number` agar kompatibel dengan berbagai komponen.
  </action>
  <verify>Data antrean requisition pending memuat array detail item yang lengkap beserta nama, satuan, harga satuan, dan subtotal.</verify>
  <done>Kueri Supabase dan normalisasi data detail requisition berhasil diimplementasikan.</done>
</task>

<task type="auto">
  <name>Task 3: Desain Ulang Tabel Rincian Material & Integrasi Pagu Gate 2 di Kartu Requisition</name>
  <files>src/components/RequisitionApproval.tsx</files>
  <action>
    - Desain ulang tabel rincian material pada setiap kartu requisition:
      * Header 4 kolom: `MATERIAL` | `JUMLAH DIMINTA` | `ESTIMASI HARGA (RP)` | `SUBTOTAL (RP)`.
      * Baris item: render nama material dengan teks tebal kontras, kuantitas dengan satuan, format Rupiah harga satuan (`Rp X.XXX.XXX`), dan subtotal.
      * Baris kosong informatif jika suatu requisition tidak memiliki item.
      * Footer tabel: tampilkan **"Total Estimasi Biaya Requisition: Rp X.XXX.XXX"** dengan highlight aksen oranye RobelKaroseri.
    - Perbarui kotak catatan peringatan Gate 2:
      * Tampilkan: *"Total Permintaan: Rp X.XXX.XXX. Pastikan jumlah ini sesuai dengan alokasi RAB sebelum menyetujui."*
    - Perbarui dialog konfirmasi persetujuan agar menyertakan total estimasi biaya permintaan belanja.
  </action>
  <verify>Kartu Pending Requisitions merender tabel rincian 4 kolom lengkap dengan harga satuan, subtotal, footer total belanja, dan peringatan Gate 2 yang informatif.</verify>
  <done>Antarmuka kartu Pending Requisitions (Mandor) selesai didesain ulang.</done>
</task>
