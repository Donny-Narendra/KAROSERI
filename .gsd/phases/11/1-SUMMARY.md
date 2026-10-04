# Plan 11.1 Summary

**Status**: ✅ Complete

## Tasks Completed
- **Migrasi penambahan kolom custom_unit_price pada inventory_transactions**: Migrasi SQL telah dibuat.
- **Implementasi Checkbox Seleksi, Revert Stock saat Delete, dan Modal Edit Harga**:
  - `RecentMaterialIssues` telah dibuat sebagai komponen terpisah dan digunakan di `WarehouseDashboard.tsx`.
  - Fungsi `deleteIssuesAndRevertStock` dan `updateIssuePrice` telah ditambahkan di `inventoryService.ts`.
  - Logic penghitungan actual material cost di `KasirDashboard.tsx` dan `AdminDashboardPage.tsx` telah diperbarui dengan field `custom_unit_price`.

## Notes
- Migrasi belum dieksekusi di instance Supabase, karena harus dijalankan via npx supabase migration up. Namun file SQL dan schema referensi sudah ditangani.
