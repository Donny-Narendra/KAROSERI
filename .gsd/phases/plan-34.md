---
phase: 34
plan: refactor-tracking-spk-no
wave: 1
gap_closure: true
---

# Fix: Refactor Parameter URL Publik Pelacakan Progres ke SPK No

## Problem
Penggunaan VIN (Nomor Rangka) sebagai parameter URL pelacakan mungkin kurang ideal karena konsumen lebih familiar dengan Nomor SPK (yang tertera jelas di dokumen faktur/kwitansi DP). Kebutuhan telah diubah agar sistem tracking menggunakan Nomor SPK.

## Root Cause
Pada fase 33, implementasi dibuat menggunakan parameter `:vin` pada URL dan mencocokannya ke `vehicle_number` atau `vehicle_plate`. Ini tidak sejalan dengan instruksi perubahan kebutuhan terbaru yang mensyaratkan penggunaan `:spk_no`.

## Tasks

<task type="auto">
  <name>Penyesuaian Router Endpoint</name>
  <files>src/App.tsx</files>
  <action>Ubah route `path="/tracking/:vin"` menjadi `path="/tracking/:spk_no"` di dalam konfigurasi React Router `App.tsx`.</action>
  <verify>Pola URL berubah dari `/tracking/ABC...` menjadi `/tracking/SPK-123...`.</verify>
</task>

<task type="auto">
  <name>Perbarui Komponen PublicProgressTracking</name>
  <files>src/pages/PublicProgressTracking.tsx</files>
  <action>Tangkap `spk_no` dari URL `useParams<{ spk_no: string }>()`. Gunakan sebagai identifier pada rate limit (`tracking_limit_${spk_no}_${today}`). Ubah query ke `spk` agar mencari berdasarkan kolom `spk_no` (`.eq('spk_no', spk_no)`), bukan `.or('vehicle_number... vehicle_plate...')`. Perbarui pesan error jika tidak valid.</action>
  <verify>Query ke Supabase menggunakan indeks unik `spk_no`, logika rate limit beradaptasi pada identifier `spk_no`.</verify>
</task>

<task type="auto">
  <name>Penyesuaian Tombol Tautan di KasirDashboard</name>
  <files>src/pages/KasirDashboard.tsx</files>
  <action>Perbarui URL yang disalin oleh fungsi `navigator.clipboard.writeText` dari `${window.location.origin}/tracking/${selectedSpk.vin}` menjadi `${window.location.origin}/tracking/${selectedSpk.id}` (karena `selectedSpk.id` sudah menyimpan data `spk_no`).</action>
  <verify>Link yang dicopy oleh kasir mencerminkan `spk_no`.</verify>
</task>
