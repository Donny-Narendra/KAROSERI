---
phase: 18
plan: fix-filter-spk-kasir
wave: 1
gap_closure: true
---

# Fix: Proteksi filter antrean SPK Kasir dari RAB alokasi parsial

## Problem
SPK dengan alokasi paket yang belum tuntas (masih menyisakan material) dapat muncul di halaman antrean Kasir (/kasir), yang memungkinkan transaksi dilanjutkan padahal estimasi biaya belum final.

## Root Cause
Fungsi penarikan SPK pending payment untuk Kasir (`fetchPendingSpk` / query SPK antrean DP) belum memeriksa kelengkapan alokasi paket BOM.

## Tasks

<task type="auto">
  <name>Proteksi filter antrean SPK Kasir dari RAB alokasi parsial</name>
  <files>src/pages/KasirDashboard.tsx, src/services/billingService.ts</files>
  <action>
    1. Periksa fungsi penarikan SPK pending payment untuk Kasir (`fetchPendingSpk` / query SPK antrean DP).
    2. Tambahkan pengecekan: pastikan SPK yang ditampilkan di Kasir memiliki seluruh paket BOM dalam kondisi tuntas (seluruh kuota material telah terbagi habis).
    3. Jika SPK masih memiliki alokasi paket yang parsial/belum tuntas, sembunyikan dari daftar tagihan Kasir agar uang muka tidak ditransaksikan sebelum estimasi tervalidasi penuh.
  </action>
  <verify>Buka /kasir di browser, pastikan SPK dengan alokasi paket yang belum tuntas tidak muncul di antrean Kasir sampai SA menuntaskan pembagian alokasinya di /advisor.</verify>
  <done>Kasir terlindungi dari pemrosesan SPK yang perencanaannya belum lengkap.</done>
</task>
