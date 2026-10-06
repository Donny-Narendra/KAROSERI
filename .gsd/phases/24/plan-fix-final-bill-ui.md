---
phase: 24
plan: fix-final-bill-ui
wave: 1
gap_closure: true
---

# Fix: Perbaikan Formula Pelunasan Akhir Kasir dengan Mengikutsertakan Nilai Change Order Approved

## Problem
Pada modul Kasir / Billing (`src/pages/KasirDashboard.tsx`):
- SPK-1527 memiliki Change Order (Amandemen) berstatus APPROVED senilai +Rp 500.000,00.
- Konsumen telah membayar Uang Muka (DP) sebesar Rp 2.000.000,00.
- Biaya pekerjaan awal: Material (Rp 1.148.875) + Jasa (Rp 492.375) = Subtotal Rp 1.641.250,00.
- Error Saat Ini: Komponen Kasir belum menyertakan nilai Change Order ke Subtotal sebelum dikurangi DP secara visual dengan benar, membingungkan total akhirnya.

## Root Cause
Tampilan UI di `KasirDashboard.tsx` tidak memisahkan `Subtotal (Actual Cost)` dari `Total Akhir Proyek`. Akibatnya, nilai `amendmentCost` dimasukkan ke dalam Subtotal secara langsung, dan alur perhitungannya menjadi tidak transparan.

## Tasks

<task type="auto">
  <name>Sertakan change order approved ke kalkulasi subtotal dan final bill kasir</name>
  <files>src/pages/KasirDashboard.tsx</files>
  <action>
    1. Di `KasirDashboard.tsx`:
       - Perbarui formula kalkulasi tagihan pelunasan akhir agar menambahkan `approved_amendments_total` ke Subtotal sebelum dikurangi Down Payment (DP).
       - Di panel Cost Breakdown, render baris rincian "Change Orders (Approved)" jika nominalnya > 0.
       - Pastikan angka `Final Bill to Customer` pada SPK-1527 otomatis berubah dari Rp 0,00 menjadi Rp 141.250,00.
  </action>
  <verify>Jalankan oxlint / npm run build, buka tab Pelunasan Akhir pada SPK-1527 di /kasir, pastikan baris Change Order (+Rp 500.000,00) muncul dan Final Bill to Customer bernilai tepat Rp 141.250,00.</verify>
  <done>Penagihan pelunasan akhir di kasir menghitung seluruh pekerjaan tambahan yang telah disetujui owner secara akurat.</done>
</task>
