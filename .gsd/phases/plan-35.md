---
phase: 35
plan: kasir-dp-history-tracking-link
wave: 1
gap_closure: true
---

# Fix: Aksi Pelacakan Konsumen pada Histori DP Kasir

## Problem
Kasir membutuhkan cara cepat untuk membagikan tautan pelacakan konsumen langsung dari bagian "Riwayat DP Diterima" setelah kuitansi DP dilihat atau dicetak. Sebelumnya, akses link ini hanya ada di bagian Calculator, namun kasir biasanya fokus pada histori DP saat berinteraksi dengan konsumen pasca-pembayaran.

## Root Cause
Link belum disematkan pada komponen card di sub-tab Riwayat DP.

## Tasks

<task type="auto">
  <name>Pembaruan Komponen Riwayat DP KasirDashboard</name>
  <files>src/pages/KasirDashboard.tsx</files>
  <action>Cari render card riwayat DP (`payment.status === 'LUNAS'` dan `dpHistory`). Tambahkan div container fleksibel di bagian footer setiap card riwayat DP (sejajar dengan tombol Cetak Kuitansi DP). Render link atau url lengkap pelacakan `${window.location.origin}/tracking/${payment.spk_no}`, beserta tombol "Salin" (menggunakan `navigator.clipboard.writeText`) dan tombol "Buka Laporan Progres" (buka tab baru). Sembunyikan elemen ini jika SPK statusnya DRAFT.</action>
  <verify>Aksi link pelacakan dan tombol salin muncul di bawah histori pembayaran DP (sejajar rata kiri tombol cetak), bisa diklik dan valid.</verify>
</task>
