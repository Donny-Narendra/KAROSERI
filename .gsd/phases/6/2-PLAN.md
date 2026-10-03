---
phase: 6
plan: 2
wave: 1
---

# Plan 6.2: Admin Dashboard - SPK Cancel Audit Log

## Objective
Buat log viewer khusus di Admin Dashboard untuk memonitor SPK draf yang dibatalkan (`status = 'CANCELLED'`).

## Context
- .gsd/GAP_ANALYSIS_DASHBOARD_ROLES.md
- src/pages/AdminDashboardPage.tsx

## Tasks

<task type="auto">
  <name>Implement Audit Log for Cancelled SPKs</name>
  <files>src/pages/AdminDashboardPage.tsx</files>
  <action>
    - Update `AdminDashboardPage.tsx` dengan membuat section/tab baru untuk "Log SPK Dibatalkan".
    - Fetch SPK dengan `status = 'CANCELLED'` dari Supabase.
    - Tampilkan dalam format tabel/list sederhana mencakup Plat Nomor Kendaraan, Waktu Cancel, dan Keterangan (catatan).
  </action>
  <verify>npm run build</verify>
  <done>Admin can view all cancelled SPKs in a dedicated table</done>
</task>

## Success Criteria
- [ ] Admin Dashboard contains a section/table for SPK Cancellations.
- [ ] Query correctly targets `status = 'CANCELLED'`.
