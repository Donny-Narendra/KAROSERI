---
phase: 6
plan: 1
wave: 1
---

# Plan 6.1: Admin Dashboard - Actual Costing vs Projected Margin

## Objective
Implement agregasi biaya aktual (dari material dan labor) vs estimasi (dari RAB) untuk memberikan visibilitas margin keuntungan kepada Admin/Owner.

## Context
- .gsd/GAP_ANALYSIS_DASHBOARD_ROLES.md
- src/pages/AdminDashboardPage.tsx

## Tasks

<task type="auto">
  <name>Implement Actual vs Projected Costing Visualization</name>
  <files>src/pages/AdminDashboardPage.tsx</files>
  <action>
    - Update `AdminDashboardPage.tsx` untuk menghitung dan membandingkan *Total Projected Cost* (dari RAB/estimasi) dengan *Total Actual Cost* (material dari `inventory_transactions` + labor aktual).
    - Tambahkan visualisasi (misal bar/progress sederhana dengan Tailwind) untuk menampilkan komparasi "Estimated vs Actual" secara global atau rata-rata per SPK.
    - Hindari dummy data; pastikan query mengambil dari tabel Supabase `spk` dan aggregasinya.
  </action>
  <verify>npm run build</verify>
  <done>Admin Dashboard successfully shows comparison between total estimation cost and total actual cost without relying on mock data</done>
</task>

## Success Criteria
- [ ] Admin Dashboard UI presents clear comparison of RAB estimation vs Actual Cost.
- [ ] No PostgreSQL errors in console.
