---
phase: 7
plan: 1
wave: 1
---

# Plan 7.1: Implementasi Fitur Riwayat/Histori Pembayaran DP di Kasir Dashboard

## Objective
Kasir memerlukan visibilitas untuk melihat daftar SPK yang DP-nya sudah terbayarkan (audit log penerimaan uang muka, nomor kuitansi/referensi, nominal DP, metode pembayaran, tanggal bayar, dan cetak ulang bukti bayar DP).

## Context
Pada dashboard Kasir (`src/pages/KasirDashboard.tsx`), tab/bagian Penerimaan Uang Muka (DP) saat ini hanya menampilkan draf SPK yang belum dibayar.

## Tasks

<task type="auto">
  <name>Tambahkan filter Riwayat DP Diterima dan komponen tabel histori pada KasirDashboard</name>
  <files>src/pages/KasirDashboard.tsx, src/components/DpHistoryList.tsx, src/services/billingService.ts</files>
  <action>
    1. Buat filter sub-tab pada bagian Penerimaan DP: "Menunggu DP" dan "Riwayat DP Diterima".
    2. Buat fungsi helper di `billingService.ts` untuk fetching SPK dengan `dp_amount > 0` beserta timestamp pembayarannya.
    3. Buat komponen `DpHistoryList.tsx` untuk menampilkan daftar pembayaran DP yang sudah tervalidasi.
    4. Sediakan modal preview kuitansi sederhana ketika tombol "Cetak Kuitansi DP" diklik (trigger window.print()).
  </action>
  <verify>npm run build</verify>
  <done>Kasir dapat melihat seluruh riwayat uang muka yang telah dibayarkan konsumen.</done>
</task>

## Success Criteria
- [ ] Tab "Riwayat DP Diterima" menampilkan data pembayaran DP PT Logistik Nusantara.
- [ ] Tombol kuitansi membuka preview cetak bukti pembayaran.
