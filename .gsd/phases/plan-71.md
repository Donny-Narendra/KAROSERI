---
phase: 71
plan: sync-recent-material-issues-with-spk-filter
wave: 1
gap_closure: true
---

# Gap Closure: Menghubungkan Tabel "Recent Material Issues" Sepenuhnya dengan Filter SPK Terpilih di Halaman /warehouse

## Problem
1. Pada halaman `/warehouse` (tab Mandor Requests / Issue Material), saat petugas gudang memilih filter SPK tertentu di panel samping (misal: SPK-6633), tabel "Recent Material Issues" di bagian bawah masih menampilkan data pengeluaran material milik SPK lain (misal: RK071026-05).
2. Data riwayat pengeluaran barang (Goods Issue) belum terikat dengan konteks SPK yang sedang dipilih oleh petugas.
3. Ketika sistem dalam kondisi tanpa filter (pilihan "Semua SPK" aktif atau belum ada SPK yang dipilih), tabel masih menampilkan seluruh riwayat secara global sehingga membingungkan petugas gudang dan berisiko salah identifikasi unit fisik kendaraan.

## Root Cause
1. Komponen `RecentMaterialIssues` di `WarehouseDashboard.tsx` belum menerima prop `selectedSpkFilter` dari state filter SPK aktif di dashboard.
2. Fungsi `fetchIssues` di `RecentMaterialIssues.tsx` melakukan query global `order('issued_at', { ascending: false }).limit(20)` tanpa klausa filter `.eq('spk_id', targetSpkId)`.
3. Belum ada penjaga logika (guard condition): jika filter adalah `'ALL'` atau belum ada SPK terpilih, rendering riwayat harus dikosongkan dan menampilkan empty state / placeholder informatif.
4. Input search box dan checkbox "Pilih Semua" (Select All) belum diselaraskan untuk beroperasi hanya pada data material di dalam SPK yang terpilih.

## Tasks

<task type="auto">
  <name>Task 1: Penyesuaian Query & State Filter pada RecentMaterialIssues.tsx</name>
  <files>src/components/RecentMaterialIssues.tsx</files>
  <action>
    - Tambahkan prop `selectedSpkFilter?: string` pada `RecentMaterialIssuesProps`.
    - Di `fetchIssues`:
      * Jika `!selectedSpkFilter || selectedSpkFilter === 'ALL'`: kosongkan `recentIssues`, bersihkan seleksi `selectedIds`, dan hentikan pemanggilan API ke Supabase.
      * Jika SPK terpilih aktif: tentukan apakah nilai berupa UUID atau Nomor SPK (`spk_no`), cari `spk_id` terkait jika perlu, dan jalankan query `inventory_transactions` dengan filter ketat `.eq('spk_id', targetSpkId)` diurutkan `issued_at` descending.
    - Implementasikan state `searchQuery` dan memoized list `displayedIssues` untuk menyaring nama material / satuan dalam konteks SPK terpilih.
    - Sesuaikan `handleSelectAll` dan `handleSingleVoid` agar hanya memilih dan memproses ID yang berada dalam `displayedIssues`.
  </action>
  <verify>Query hanya mengambil data yang cocok dengan SPK aktif dan tidak mengeksekusi query global saat filter nonaktif.</verify>
  <done>Logika query dan state filter di RecentMaterialIssues.tsx selesai disesuaikan.</done>
</task>

<task type="auto">
  <name>Task 2: Penyesuaian Antarmuka & Empty State Placeholder</name>
  <files>src/components/RecentMaterialIssues.tsx</files>
  <action>
    - Pada Header tabel: Tampilkan badge info SPK aktif (misal `SPK: SPK-6633`) di samping judul "Recent Material Issues".
    - Pada Search Box: Hubungkan input dengan `searchQuery`, atur placeholder informatif, dan disable input ketika filter SPK belum dipilih (`selectedSpkFilter === 'ALL'`).
    - Pada Checkbox Header (Select All): Disable checkbox ketika tidak ada SPK terpilih atau daftar transaksi kosong.
    - Pada Tbody:
      * Tampilkan spinner loading saat sedang mengambil data.
      * JIKA `!selectedSpkFilter || selectedSpkFilter === 'ALL'`: Tampilkan empty state placeholder informatif:
        "Silakan pilih salah satu SPK pada daftar filter di panel kanan untuk menampilkan riwayat pengeluaran material (Recent Material Issues)."
      * JIKA SPK terpilih namun belum ada pengeluaran: Tampilkan pesan ramah bahwa belum ada material dikeluarkan untuk SPK ini.
      * JIKA ada data: Render baris material issued dengan checkbox, jam, nomor SPK, nama material, qty, harga, serta tombol Edit dan Void.
  </action>
  <verify>Tabel menampilkan placeholder saat 'Semua SPK' aktif dan menampilkan baris material saat SPK spesifik dipilih.</verify>
  <done>Antarmuka tabel dan empty state informatif di RecentMaterialIssues.tsx selesai diimplementasikan.</done>
</task>

<task type="auto">
  <name>Task 3: Koneksi Prop di WarehouseDashboard.tsx & Aksesibilitas Filter</name>
  <files>src/pages/WarehouseDashboard.tsx, supabase/migrations/20261014_add_inventory_transactions_spk_index.sql</files>
  <action>
    - Kirimkan `selectedSpkFilter={selectedSpkFilter}` ke komponen `<RecentMaterialIssues />`.
    - Perbarui `fetchPendingReqCount` agar sekaligus menginisialisasi `spkFilterList` saat pertama kali halaman dimuat, sehingga sidebar langsung siap digunakan.
    - Tampilkan `SpkFilterListBox` pada tab `requisition` maupun `issue` agar petugas gudang leluasa memfilter SPK di kedua mode kerja utama.
    - Buat skrip migrasi indeks komposit `supabase/migrations/20261014_add_inventory_transactions_spk_index.sql` untuk optimasi query `(spk_id, issued_at DESC)` di database.
  </action>
  <verify>Memilih SPK di sidebar kanan langsung memicu sinkronisasi data tabel Recent Material Issues di bagian bawah.</verify>
  <done>Prop disalurkan di WarehouseDashboard.tsx dan skrip migrasi indeks telah disiapkan.</done>
</task>
