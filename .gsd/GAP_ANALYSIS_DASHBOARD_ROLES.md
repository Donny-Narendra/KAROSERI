# Gap Analysis & Audit Status Implementasi Dashboard Per-Role

Berdasarkan hasil audit empiris terhadap *codebase* (`src/`, `supabase/migrations/`), berikut adalah perbandingan antara PRD dan status implementasi aktual.

## A. Ringkasan Status per Role

| Role | Fitur PRD | Status di Codebase | Path File / Bukti Empiris | Action Item Lanjutan |
| --- | --- | --- | --- | --- |
| **Pemilik / Admin** | Master Tarif Sewa Stasiun & Listrik/Overhead Waktu | `DONE` | `supabase/migrations/20261002000000_workshop_settings.sql`<br>`src/pages/AdminSettingsPage.tsx` | - |
| | Visualisasi Dashboard Finansial: Komparasi Margin Proyeksi vs Biaya Riil | `PARTIAL` | `src/pages/AdminDashboardPage.tsx` (Hanya total estimasi biaya WIP, belum ada komparasi *actual vs projected*) | Implementasi agregasi biaya aktual vs estimasi di DB, dan tambahkan chart. |
| | Audit Log / Monitoring SPK Draf yang Dibatalkan | `NOT_STARTED` | `src/pages/AdminDashboardPage.tsx` (Tidak ada tabel log khusus pembatalan) | Buat log viewer untuk `status = CANCELLED`. |
| **Service Advisor** | Registrasi Masuk / Vehicle Check-in (Nopol, VIN/Sasis, Mesin, Foto 360) | `PARTIAL` | `src/components/SpkForm.tsx` (VIN/Sasis dan Nomor Mesin tidak ada di form) | Tambahkan input fields untuk VIN dan Nomor Mesin di `SpkForm` dan schema DB. |
| | Generator/Kalkulator RAB Otomatis (Bahan + Jasa + Overhead) | `PARTIAL` | `src/components/RabCalculator.tsx` (Hanya kalkulasi Material & Labor, belum mengakomodasi *Time-based Overhead*, form masih di-_mock_ tanpa save ke DB) | Hubungkan `RabCalculator` ke backend dan tambahkan variabel overhead waktu. |
| | Mekanisme Change Order / Penerbitan SPK Tambahan | `DONE` | `src/components/AmendmentManager.tsx`<br>`supabase/migrations/20261001000001_spk_schema.sql` (Tabel `spk_amendments`) | - |
| | Fitur Aksi Pembatalan Draf SPK (Void/Cancel) | `DONE` | `src/components/CancelSpkModal.tsx`<br>`src/pages/ServiceAdvisorDashboard.tsx` | - |
| **Mandor** | Taskboard / Antrean Fisik 5 Tahap WBS | `PARTIAL` | `src/components/WbsChecklist.tsx` (UI statis, belum *fetching/upsert* ke Supabase) | Implementasi CRUD riil untuk Checklist WBS. |
| | Form Digital Quality Control (QC) Hard-Gate | `PARTIAL` | `src/components/QcInspectionForm.tsx` (Hanya *mock* `console.log`, Uji Kelistrikan tidak ada) | Tambah field kelistrikan, sambungkan tombol Submit ke Supabase. |
| | Pencegahan WBS ditutup jika QC belum berstatus "Pass" | `NOT_STARTED` | Logika validasi *Hard-Gate* di backend (trigger/RLS) belum ada. | Buat RLS/Trigger di DB untuk mengunci WBS. |
| **Petugas Gudang** | Modul Pengeluaran Barang Aktual (*Goods Issue*) | `PARTIAL` | `src/components/GoodsIssueForm.tsx` (Menggunakan *mock data* RAB dan Material, mutasi ke DB di-*comment*) | Hubungkan relasi Material - RAB ke form Goods Issue dengan Supabase RPC. |
| | Manajemen retur material sisa / consumables | `NOT_STARTED` | Tidak ditemukan rute atau komponen terkait Return. | Buat modul `GoodsReturnForm`. |
| | Indikator peringatan stok kritis material sasis/pelat | `NOT_STARTED` | Tidak ditemukan di `WarehouseDashboard.tsx`. | Implementasi peringatan *stockout* berdasarkan *Threshold* di `materials`. |
| **Kasir** | Pencatatan Uang Muka (DP) memicu mulainya pengerjaan WBS | `NOT_STARTED` | Form input DP belum ada (status dan nominal masih *mock*). | Buat modul pencatatan DP/Pembayaran awal yang mengubah status SPK menjadi `ACTIVE`. |
| | Kalkulator Penagihan Akhir Otomatis | `PARTIAL` | `src/pages/KasirDashboard.tsx` (Jasa *hardcoded* Rp15.000.000, Overhead belum dihitung, Material *fallback* ke estimasi) | Implementasi agregasi biaya aktual (*Actual Cost*) dari WBS dan Material. |
| | Penguncian Serah Terima Unit (*Handover Lock*) | `PARTIAL` | `src/pages/KasirDashboard.tsx` (Validasi ada di UI *disabled button*, namun properti `qcStatus` / `paymentStatus` hanya statis/di-*mock*) | Sambungkan state UI dengan data dari Supabase. |
| | Generator Cetak Faktur Penjualan, Kuitansi, BAST | `NOT_STARTED` | Tombol cetak tidak berfungsi (tidak ada *action* PDF/Print). | Implementasi cetak BAST / *Invoice Generation*. |

---

## B. Bukti Empiris Temuan (`Evidence Verification`)

- **Supabase Migrations:**
  Tabel migrasi yang relevan sudah dibuat (contoh: `workshop_settings`, `qc_inspections`, `wbs_checklists`, `spk_amendments`, `inventory_transactions`). Ini menjadi fondasi backend yang solid, namun banyak komponen *frontend* masih belum memanfaatkannya.
- **Frontend / React Components:**
  - `QcInspectionForm.tsx` baris 22-28 memperlihatkan mutasi backend baru sebatas `console.log("Submitting QC Inspection (Mock):", payload);`.
  - `GoodsIssueForm.tsx` baris 11-20 menggunakan konstanta `MOCK_RAB_DATA` dan `MOCK_MATERIALS` tanpa membaca RAB aktual.
  - `KasirDashboard.tsx` baris 37 melakukan *hardcoding* untuk `jasaCost: 15000000`, dan validasi status *LUNAS* hanya memutasi *state* reaktif tanpa pembaruan ke Supabase (baris 51).
  - `WbsChecklist.tsx` membiarkan kode `supabase.from('wbs_checklists').upsert` di-*comment* (baris 32-38).

---

## C. Rekomendasi Urutan Perbaikan (Wave Roadmap)

Fitur-fitur yang `NOT_STARTED` dan `PARTIAL` harus dieksekusi secara berurutan sesuai alur bisnis bengkel (Hulu ke Hilir):

**Wave 1: Perbaikan Input Hulu (SPK & RAB)**
- Penambahan field VIN/Sasis dan Nomor Mesin pada `SpkForm` dan tabel `spk`.
- Koneksi `RabCalculator` ke backend agar Estimasi RAB benar-benar tersimpan ke DB (`rab_estimations` & `rab_items`).
- Integrasi Kalkulasi *Time-Based Overhead* di RAB berdasarkan `workshop_settings`.

**Wave 2: Aktualisasi Produksi (WBS & Logistik)**
- Aktifkan query dan mutasi DB pada `WbsChecklist.tsx`.
- Hubungkan `GoodsIssueForm.tsx` dengan tabel RAB aktual untuk memvalidasi limit material aktual vs estimasi.
- Tambahkan fitur retur material dan peringatan *stockout*.

**Wave 3: Validasi QC & Handover (Hilir)**
- Implementasi penuh integrasi Supabase pada `QcInspectionForm.tsx` (lengkap dengan parameter Uji Kelistrikan).
- Buat form / modal untuk pencatatan DP awal yang memicu SPK berstatus WBS `ACTIVE`.
- Integrasi Penagihan Akhir dan logika Cetak BAST/Invoice pada `KasirDashboard`.

**Wave 4: Monitoring (Admin)**
- Visualisasi dasbor *Actual Costing* yang membandingkan Total Estimasi RAB dengan Pengeluaran Logistik (*inventory_transactions*).
- Tambahkan Audit Log Monitoring SPK Cancel.
