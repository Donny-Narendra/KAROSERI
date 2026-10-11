# Summary: Pembuatan Dokumen Berita Acara Serah Terima (BAST) Profesional Siap Cetak & Integrasi Release Vehicle di Kasir

## Completed Tasks
- **Komponen Dokumen & Modal BAST (`src/components/BastModal.tsx`)**:
  - Dibuat komponen `BastModal.tsx` dengan pratinjau modal interaktif dan template cetak dokumen resmi berstandar hukum karoseri A4 portrait.
  - Memuat Kop Surat RobelKaroseri lengkap (Nama bengkel, PT ROBEL KAROSERI INDONESIA, spesialisasi pembuatan & modifikasi, alamat workshop, kontak telepon/email, dan garis pembatas ganda hitam tebal).
  - Judul Dokumen resmi: "BERITA ACARA SERAH TERIMA KENDARAAN (BAST)" dengan penomoran dinamis `BAST/{spk_no}/{tahun}/{bulan}`.
  - Pernyataan penyerahan unit antara RobelKaroseri (Pihak Pertama / Yang Menyerahkan) dan Konsumen/Perusahaan (Pihak Kedua / Yang Menerima) dengan tanggal formal bahasa Indonesia.
  - Tabel spesifikasi unit lengkap dengan border solid: Nomor SPK Induk, Nama Pelanggan, Nomor Polisi Kendaraan, Nomor Rangka (VIN), Nomor Mesin, dan Tanggal Penyerahan.
  - Pernyataan Pengujian & Keuangan (2 Box):
    - Uji Inspeksi Akhir (Final QC): Status LULUS (PASSED) dengan ikon verifikasi.
    - Penyelesaian Pembayaran: Status LUNAS (PAID IN FULL) dengan ikon verifikasi.
  - 3 Kolom pengesahan tanda tangan sejajar:
    - Yang Menyerahkan (RobelKaroseri / Kasir)
    - Mengetahui (Kepala Bengkel / QC Mandor)
    - Yang Menerima (Konsumen / Pemilik Kendaraan)
  - Toolbar aksi pratinjau modal: Tombol "Cetak Dokumen / Simpan PDF" (`window.print()`) dan tombol "Tutup", serta fitur auto-print saat modal dibuka.

- **Styling CSS Cetak (@media print) A4 Portrait 1 Halaman**:
  - Menyembunyikan seluruh elemen luar (`body * { visibility: hidden; }`, `.no-print { display: none !important; }`).
  - Menampilkan hanya area `#bast-print-area` di sudut kiri atas kertas (`visibility: visible; position: absolute; left: 0; top: 0;`).
  - Mengonfigurasi `@page { size: A4 portrait; margin: 15mm; }` dengan latar belakang putih bersih (`#ffffff`) dan teks hitam pekat (`#000000`).
  - Mengatur ukuran dan spasi agar dokumen pas tepat dalam 1 lembar halaman A4 tanpa ada overflow ke halaman kedua.

- **Integrasi Tombol di Kasir Dashboard (`src/pages/KasirDashboard.tsx`)**:
  - Memetakan field `vehiclePlate`, `vehicleVin`, dan `vehicleEngine` dari `public.spk` ke state SPK di Kasir.
  - Menghubungkan tombol "Release Vehicle & Print BAST":
    - Melakukan update kolom `status` pada tabel `public.spk` menjadi `'COMPLETED'` jika belum berstatus COMPLETED.
    - Membuka modal `BastModal` untuk SPK terpilih dengan data lengkap (`spk_no`, `customer_name`, `vehicle_plate`, `vehicle_vin`, `vehicle_engine`, dsb.).

- **Verifikasi & Type Checking**:
  - `npm run build` (`tsc -b && vite build`) sukses 100% tanpa error.
  - `npx oxlint` lolos dengan 0 error.
  - Pengujian render komponen dengan data SPK-9846 PT WARA-WIRI terbukti memuat seluruh parameter dengan akurat.
