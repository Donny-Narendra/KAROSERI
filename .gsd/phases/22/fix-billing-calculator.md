---
phase: 22
plan: fix-billing-calculator
wave: 1
gap_closure: true
---

# Fix: Integrasikan Amandemen SPK (Change Order Approved) ke Billing Calculator Kasir

## Problem
Pada halaman Kasir / Billing (`src/pages/KasirDashboard.tsx` atau `src/components/BillingCalculator.tsx`):
- SPK-1527 memiliki amandemen (Change Order) senilai +Rp 500.000 yang statusnya sudah disetujui (APPROVED) oleh Owner.
- Namun di Billing Calculator Kasir, nilai Subtotal dan Final Bill to Customer masih tetap Rp 1.641.250,00 (belum bertambah Rp 500.000 menjadi Rp 2.141.250,00).
- Kasir tidak menampilkan baris rincian amandemen/change order yang disetujui.

## Root Cause
- Kalkulasi tagihan saat ini belum secara eksplisit menambahkan nilai dari `spk_amendments` yang berstatus `APPROVED`.
- Komponen UI untuk Cost Breakdown di KasirDashboard belum mengakomodasi baris tambahan untuk amandemen.

## Tasks

<task type="auto">
  <name>Tarik spk_amendments approved dan integrasikan ke perhitungan kasir</name>
  <files>src/pages/KasirDashboard.tsx, src/services/billingService.ts</files>
  <action>
    1. Di `billingService.ts` (atau service/helper terkait), perbarui fungsi pengambilan detail kalkulasi billing SPK agar ikut mengambil seluruh baris dari `spk_amendments` dengan filter `status = 'APPROVED'`.
    2. Hitung total nilai `approved_amendments_total` dan masukkan ke payload perhitungan tagihan SPK.
    3. Di `KasirDashboard.tsx`:
       - Tampilkan baris "Amandemen (Change Orders)" di bagian Cost Breakdown jika nilainya > 0.
       - Perbarui kalkulasi `Subtotal (Actual Cost)` dan `Final Bill to Customer` agar otomatis menjumlahkan nilai amandemen tersebut.
       - Pastikan pembaruan ini berlaku baik di tab "Penerimaan DP" maupun tab "Pelunasan Akhir".
  </action>
  <verify>Jalankan oxlint / npm run build, buka /kasir di browser, pilih SPK-1527, pastikan muncul baris Amandemen/Change Order +Rp 500.000 dan Final Bill berubah menjadi Rp 2.141.250,00.</verify>
  <done>Biaya Change Order yang disetujui Owner otomatis menambah tagihan akhir di Kasir.</done>
</task>
