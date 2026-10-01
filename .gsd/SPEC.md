# RobelKaroseri: Sistem Manajemen Bengkel Modifikasi Karoseri Truk (Job-Order Vehicle Modification)

## 1. Fondasi Sistem: Activity-Based / WBS-Centric Core
Proyek ini menggunakan 5 Pos Kerja (Work Breakdown Structure - WBS):
1. **WBS 1:** Pembongkaran
2. **WBS 2:** Sasis/Rangka
3. **WBS 3:** Dinding/Fabrikasi
4. **WBS 4:** Cat/Finishing
5. **WBS 5:** Kelistrikan/Hidrolik

## 2. 5 User Role & Segregation of Duties
1. **Owner/Admin:** Memiliki akses penuh dan otorisasi untuk override aturan sistem.
2. **Service Advisor:** Bertanggung jawab dalam penerimaan dan penjadwalan.
3. **Mandor/Ka. Bengkel:** Bertanggung jawab atas kualitas (QC) dan operasional bengkel (WBS).
4. **Petugas Gudang:** Mengelola inventaris dan pengeluaran barang.
5. **Kasir/Keuangan:** Menangani DP, penagihan (Billing), dan pembayaran akhir.

## 3. 4 System Hard-Gates (Aturan Penahan Sistem)
Sistem memiliki penguncian alur yang sangat ketat:
1. **SPK Start Gate:** WBS pengerjaan terkunci jika status DP belum lunas/aktif dari Kasir.
2. **Material Budget Gate:** Pengeluaran barang gudang terkunci jika kuantitas melebihi pagu estimasi RAB (+ waste factor), kecuali ada otorisasi Owner atau Supplementary SPK.
3. **QC Billing Gate:** Kasir diblokir mencetak Final Billing/kuitansi jika checklist QC Mandor (Shower Test, Fungsi, Dimensi) belum berstatus "PASS".
4. **Handover Gate:** Tombol cetak BAST dan rilis fisik kendaraan terkunci sampai Kasir menandai transaksi "LUNAS".

## 4. Formula Actual Costing
Total Tagihan = (Bahan Aktual Gudang + Jasa Aktual + Biaya Overhead Waktu Aktual) - Uang Muka (DP).

## 5. UI/UX & Antarmuka (Stitch References)
Sistem menggunakan aset desain visual dari Google Stitch (Stitch RobelKaroseri Enterprise Login Portal) secara eksklusif untuk aspek antarmuka:
- **Alur Autentikasi & Login Card:** Menggunakan tata letak dan gaya komponen otentikasi Stitch.
- **Tablet Numpad & Form Input:** Mengadaptasi komponen numpad dan elemen UI layar sentuh dari Stitch (khususnya untuk akses Shopfloor Terminal).
- **Palet Warna & Styling:** Mengikuti elemen visual yang didefinisikan dalam aset Stitch (tanpa mengadopsi logika PRD Stitch).
