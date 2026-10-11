---
phase: 62
plan: fix-transform-raw-json-audit-trail-to-diff-table
wave: 1
gap_closure: true
---

# Fix: Transformasi Tampilan Raw JSON Audit Trail Menjadi Tabel Perubahan (Diff Table) dengan Paginasi di /service-advisor

## Problem
Pada halaman `/service-advisor` tab "Inventory & Audit" sub-tab "Audit Trail", riwayat audit mutasi stok dan harga (`inventory_audit_logs`) menampilkan perbandingan data mentah dalam format JSON (`JSON.stringify(log.previous_data)` dan `JSON.stringify(log.new_data)`) di dalam elemen `<pre>`. Tampilan ini sulit dibaca oleh Service Advisor, tidak menyajikan informasi selisih angka secara intuitif, dan seluruh log dimuat sekaligus tanpa paginasi sehingga berpotensi memperlambat performa antarmuka saat log bertambah banyak.

## Root Cause
1. `src/components/SAInventoryPanel.tsx`: Menggunakan blok grid 2 kolom dengan `<pre>` mentah untuk menampilkan `log.previous_data` dan `log.new_data`.
2. Belum ada helper khusus untuk mem-parsing perubahan kunci JSON, memberikan label deskriptif berbahasa Indonesia, dan menghitung selisih numerik (delta positif/negatif).
3. Tidak ada state paginasi (`currentPage`, `pageSize`) dan navigasi halaman di sub-tab "Audit Trail".

## Tasks

<task type="auto">
  <name>Task 1: Pembuatan Parser Diff Nilai JSON</name>
  <files>src/utils/auditDiffHelper.ts</files>
  <action>
    - Buat modul `src/utils/auditDiffHelper.ts` dengan fungsi `renderAuditChanges(beforeData, afterData, unit?)`.
    - Tangani parsing aman untuk objek JSON dan string JSON (`try/catch`).
    - Petakan key teknis ke label manusiawi:
      * `current_stock` / `stock` -> "Stok Fisik"
      * `added_quantity` -> "Jumlah Ditambahkan"
      * `quantity` -> "Jumlah / Kuantitas"
      * `unit_price` -> "Harga Satuan"
      * `name` -> "Nama Material"
      * `unit` -> "Satuan"
      * `minimum_stock` -> "Batas Minimum Stok"
      * `waste_factor_percentage` -> "Faktor Waste (%)"
      * `is_customer_supplied` -> "Pasokan Pelanggan"
      * `notes` -> "Catatan"
      * `reason` -> "Alasan Perubahan"
    - Hitung selisih nilai numerik (`delta` positif/negatif) dan format nilai mata uang (Rp) / unit satuan.
  </action>
  <verify>Helper mengekstrak perbedaan nilai secara akurat dengan tipe perubahan positive, negative, neutral, atau updated.</verify>
  <done>Modul parser diff siap digunakan oleh komponen UI.</done>
</task>

<task type="auto">
  <name>Task 2: Pembuatan Komponen Tabel Perubahan (AuditDiffTable)</name>
  <files>src/components/AuditDiffTable.tsx</files>
  <action>
    - Buat komponen `AuditDiffTable` yang menerima `previousData`, `newData`, dan `unit`.
    - Format kolom: `Atribut / Parameter` | `Sebelum` | `Sesudah` | `Perubahan`.
    - Beri aksen visual:
      * Nilai berkurang: teks/latar bernuansa merah/rose (`text-rose-400 bg-rose-500/10`).
      * Nilai bertambah: teks/latar bernuansa hijau/emerald (`text-emerald-400 bg-emerald-500/10`).
      * Badge perubahan/selisih: badge kontras dengan indikator panah/tanda (`+X pcs`, `-Y pcs`, `Diperbarui`).
    - Desain sesuai dark theme industrial RobelKaroseri (`border-slate-700`, `bg-slate-900/60`, teks kontras).
  </action>
  <verify>Komponen me-render tabel perbandingan bersih tanpa syntax error.</verify>
  <done>AuditDiffTable siap menggantikan blok raw JSON.</done>
</task>

<task type="auto">
  <name>Task 3: Refactor Sub-tab Audit Trail & Paginasi di SAInventoryPanel</name>
  <files>src/components/SAInventoryPanel.tsx, src/services/inventoryService.ts</files>
  <action>
    - Perbarui `inventoryService.getMaterialAuditLogs` dan tipe `InventoryAuditLog` untuk mengikutsertakan relasi `materials(name, unit)`.
    - Gantikan blok `<pre>` raw JSON di `SAInventoryPanel.tsx` dengan `AuditDiffTable`.
    - Tampilkan nama material pada header kartu log audit, serta pindahkan `notes` ke footer kartu audit dengan ikon catatan.
    - Implementasikan pagination state (`currentPage`, `pageSize` default 10).
    - Tambahkan bilah pagination di bawah daftar audit:
      * Info: "Menampilkan X - Y dari Z riwayat audit".
      * Tombol navigasi: `<< Pertama`, `< Sebelumnya`, `Halaman X dari Y`, `Berikutnya >`, `Terakhir >>`.
      * Tombol dinonaktifkan (disabled) jika berada di halaman pertama atau terakhir.
    - Tambahkan opsi pemilihan ukuran halaman (5, 10, 20 item per halaman) dan filter pencarian/kategori audit jika relevan.
  </action>
  <verify>Sub-tab Audit Trail menampilkan Diff Table dan navigasi halaman yang responsif.</verify>
  <done>Tampilan Audit Trail di /service-advisor terintegrasi penuh dengan Diff Table dan kontrol paginasi.</done>
</task>
