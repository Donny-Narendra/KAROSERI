## Phase 11 Verification

### Must-Haves
- [x] Checkbox seleksi massal muncul di tabel Recent Material Issues — VERIFIED (evidence: Komponen `RecentMaterialIssues.tsx` ditambahkan beserta implementasi `selectedIds` state)
- [x] Pembatalan transaksi mengembalikan angka stok fisik material secara otomatis — VERIFIED (evidence: Logic `UPDATE materials SET current_stock = ...` di dalam method `deleteIssuesAndRevertStock`)
- [x] Modal edit harga berfungsi menyimpan harga kustom untuk SPK terkait tanpa mengubah harga master — VERIFIED (evidence: Modal Edit Pengeluaran dan fungsi `updateIssuePrice` mengatur nilai `custom_unit_price` dan di-fetch oleh `KasirDashboard` menggunakan fallback/coalescing)

### Verdict: PASS
