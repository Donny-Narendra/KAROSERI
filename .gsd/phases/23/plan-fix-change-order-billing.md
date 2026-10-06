---
phase: 23
plan: fix-change-order-billing
wave: 1
gap_closure: true
---

# Fix: Perbaikan Integrasi Biaya Change Order Approved pada Penagihan Kasir SPK

## Problem
Cost Breakdown Kasir HANYA menghitung Material dan Jasa tanpa menyertakan amandemen yang disetujui.
Akibatnya: Subtotal - DP bernilai negatif dan di-clamp menjadi Rp 0,00, padahal konsumen masih wajib membayar sisa pelunasan.

## Root Cause
Query di `billingService.ts` untuk detail penagihan SPK belum melakukan join/fetch terhadap tabel `spk_amendments` berstatus APPROVED, dan perhitungan di UI `KasirDashboard.tsx` tidak mengakomodasi nilai amandemen.

## Tasks

<task type="auto">
  <name>Sertakan amandemen disetujui ke dalam query dan formula kalkulasi kasir</name>
  <files>src/pages/KasirDashboard.tsx, src/services/billingService.ts</files>
  <action>
    1. Di `billingService.ts`, perbarui fungsi pengambilan detail billing SPK agar menyertakan query:
       `const { data: approvedAmendments } = await supabase.from('spk_amendments').select('id, description, cost_adjustment').eq('spk_id', spkId).eq('status', 'APPROVED');`
    2. Sertakan nilai `approved_amendments_total` ke dalam objek return kalkulasi.
    3. Di `KasirDashboard.tsx`:
       - Tampilkan baris "Change Orders (Approved)" pada daftar Cost Breakdown jika nilainya > 0.
       - Masukkan nominal change order tersebut ke total biaya sebelum dikurangi Down Payment (DP).
       - Pastikan kalkulasi Final Bill to Customer untuk SPK-1527 menghasilkan angka Rp 141.250,00.
  </action>
  <verify>Jalankan oxlint / npm run build, buka halaman /kasir di browser pada SPK-1527, pastikan muncul baris Change Order +Rp 500.000,00 dan Final Bill to Customer berubah dari Rp 0,00 menjadi Rp 141.250,00.</verify>
  <done>Biaya Change Order yang disetujui terhitung di pelunasan kasir secara akurat.</done>
</task>
