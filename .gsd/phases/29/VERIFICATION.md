## Phase 29 Verification

### Must-Haves
- [x] Halaman Kasir dapat mengambil dan menampilkan `selling_price` dari `product_packages` alih-alih menampilkan Rp 0.00, serta tidak jatuh (fallback) ke HPP. — VERIFIED (Ditambahkan RLS policy agar Kasir dapat membaca `product_packages` dan mekanisme fallback HPP dihapus dari `KasirDashboard.tsx`).

### Verdict: PASS
