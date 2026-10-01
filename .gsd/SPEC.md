# Project: RobelKaroseri Management System
# Status: FINALIZED

## Executive Summary & Problem Statements
RobelKaroseri Management System adalah aplikasi untuk bengkel modifikasi karoseri truk berbasis aktivitas (WBS-centric). Aplikasi ini dirancang untuk menyelesaikan masalah operasional umum seperti:
- Material slippage (kebocoran material gudang).
- Time overhead bleeding (waktu pengerjaan yang tidak terkontrol).
- Sengketa change order (perubahan permintaan mendadak tanpa validasi).
- Rework (pengerjaan ulang akibat cacat produksi dan miskomunikasi).

## User Personas, RBAC Matrix, & Separation of Duties
Terdapat 5 peran pengguna dengan pemisahan tugas (Segregation of Duties) yang tegas:
1. **Owner/Admin:** Memiliki akses penuh atas sistem dan satu-satunya role yang berhak melakukan override aturan sistem (contoh: persetujuan overbudget).
2. **Service Advisor:** Bertanggung jawab dalam penerimaan dan penjadwalan kendaraan, termasuk Check-in, pengambilan foto 360°, dan pembuatan SPK awal.
3. **Mandor/Ka. Bengkel:** Mengelola operasional lantai bengkel berdasarkan Work Breakdown Structure (WBS), serta bertanggung jawab penuh atas kontrol kualitas (QC) melalui tablet interface.
4. **Petugas Gudang:** Mengelola inventaris, menerima material masuk, dan mengontrol pengeluaran material (Goods Issue) sesuai RAB.
5. **Kasir/Keuangan:** Menangani transaksi pembayaran DP (Down Payment), kalkulasi dan pencetakan Final Billing, penagihan akhir, serta mencetak Berita Acara Serah Terima (BAST).

## Spesifikasi WBS (Work Breakdown Structure) & Estimasi RAB
Sistem dibangun di atas fondasi WBS-Centric Core yang membagi proses pengerjaan menjadi 5 Pos Kerja:
- **WBS 1:** Pembongkaran
- **WBS 2:** Sasis/Rangka
- **WBS 3:** Dinding/Fabrikasi
- **WBS 4:** Cat/Finishing
- **WBS 5:** Kelistrikan/Hidrolik

Setiap WBS terintegrasi dengan otomatisasi estimasi RAB yang mengkalkulasikan kebutuhan bahan aktual, mempertimbangkan tingkat toleransi pembuangan (waste factor %), serta alokasi jam kerja sumber daya spesialis.

## Spesifikasi 4 System Hard-Gates & Mekanisme Override
Sistem memiliki 4 penguncian alur bisnis (Hard-Gates) yang bersifat mutlak:
1. **Gate 1 (SPK Start Gate):** WBS dan pengerjaan oleh mandor otomatis terkunci jika Surat Perintah Kerja (SPK) belum berstatus ACTIVE (artinya DP belum dibayar dan divalidasi oleh Kasir).
2. **Gate 2 (Material Budget Gate):** Pengeluaran barang dari gudang (Goods Issue) akan terkunci secara otomatis jika kuantitas barang yang diminta melebihi estimasi RAB (+ waste factor). Akses hanya dapat dibuka melalui otorisasi khusus dari Owner (Override) atau dengan penerbitan Supplementary SPK (Change Order).
3. **Gate 3 (QC Billing Gate):** Akses Kasir untuk mencetak Final Billing diblokir oleh sistem jika checklist QC dari Mandor (seperti Shower Test anti bocor, uji fungsi Hidrolik/Kelistrikan, dan kepatuhan dimensi kendaraan) belum berstatus "PASS".
4. **Gate 4 (Handover Gate):** Fitur pencetakan BAST dan tombol "Release Vehicle" terkunci erat sampai Kasir memvalidasi dan mengubah status tagihan menjadi "LUNAS".

## Formula Actual Costing, Handover Protocol, dan Skema Data Inti
- **Formula Actual Costing:**
  `Total Tagihan = (Bahan Aktual Gudang + Jasa Aktual + Biaya Overhead Waktu Aktual) - Uang Muka (DP)`
- **Handover Protocol:** Penyerahan kendaraan dan dokumen surat jalan hanya valid ketika Gate 4 terpenuhi dan status kendaraan dinyatakan selesai/released.
- **Skema Data Relasional:** Arsitektur database didesain menggunakan PostgreSQL (melalui Supabase) untuk menjamin integritas transaksi finansial yang ketat (ACID). Kombinasi field JSONB digunakan spesifik untuk kelenturan parameter form QC yang bisa berubah.
