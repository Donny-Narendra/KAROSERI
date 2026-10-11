---
phase: 49
plan: fix-mandor-material-requisition-dual-list
wave: 1
gap_closure: true
---

# Fix: Implementasi Dual-List Transfer Box pada Modal Minta Material (Requisition) Mandor

## Problem
Pada antarmuka Mandor Terminal (`/mandor`), modal "Minta Material (Requisition)" (`src/components/MaterialRequisitionForm.tsx`) saat ini menggunakan antarmuka form item tunggal yang generik dan belum terintegrasi dengan daftar rencana material RAB per tahapan WBS terkait. Akibatnya:
1. Mandor harus memilih material secara manual satu per satu dari seluruh master data material tanpa mengetahui apa saja yang telah dialokasikan pada Rencana Anggaran Biaya (RAB) untuk WBS tersebut.
2. Tidak ada panduan Qty maupun estimasi Subtotal biaya material RAB yang dialokasikan di tahap WBS aktif.
3. Alur kerja permintaan material rentan salah input atau meminta material di luar rencana kerja proyek.

## Root Cause
`MaterialRequisitionForm.tsx` hanya melakukan fetching ke tabel `materials` global dan menampung baris form ad-hoc, tanpa menghubungkan query ke `rab_estimations` dan `rab_items` milik SPK yang sedang aktif pada kategori WBS yang bersangkutan.

## Tasks

<task type="auto">
  <name>Task 1: State Management & Data Fetching Dual-List pada MaterialRequisitionForm.tsx</name>
  <files>src/components/MaterialRequisitionForm.tsx</files>
  <action>
    1. Tambahkan query pengambilan `rab_items` berdasarkan SPK aktif (`spk_id`) dan tahapan WBS (`cleanWbsCategory`), termasuk join ke `materials (id, name, unit, unit_price)` dan `item_total`.
    2. Inisialisasi struktur data item dual-list:
       - `availableItems`: Item material dari RAB WBS yang belum dipindahkan ke requisition.
       - `selectedItems`: Item material yang siap diajukan untuk requisition (dilengkapi dengan field kuantitas yang diminta `quantity`, `materialId`, `name`, `unit`, `subtotal`, dan flag `isManual`).
       - `highlightedSourceId`: ID item yang sedang disorot/dipilih di kolom kanan (RAB source).
       - `highlightedTargetId`: ID item yang sedang disorot/dipilih di kolom kiri (Requisition destination).
    3. Implementasikan handler pemindahan:
       - `handleMoveToRequisition`: Memindahkan item yang disorot dari `availableItems` ke `selectedItems` dan menghapusnya dari `availableItems`.
       - `handleMoveBackToAvailable`: Mengembalikan item non-manual dari `selectedItems` kembali ke `availableItems` dan menghapusnya dari `selectedItems` (jika item manual/ekstra, langsung dihapus).
       - Double-click shortcut untuk pemindahan instan kedua arah.
  </action>
  <verify>Data RAB items terambil sesuai WBS terpilih dan state transfer memindahkan item secara reaktif antar kedua list tanpa duplikasi.</verify>
  <done>Dual-list state dan transfer logic terimplementasi dengan mulus.</done>
</task>

<task type="auto">
  <name>Task 2: Desain Layout UI Dual-List Transfer Box (Kotak Kiri Hijau, Kontrol Tengah, Kotak Kanan Merah)</name>
  <files>src/components/MaterialRequisitionForm.tsx</files>
  <action>
    1. Desain modal berukuran lebar (`max-w-5xl`) dengan container `max-h-[90vh]` dan scrollable dual-panel.
    2. Kolom Kanan (Sumber Material RAB - Aksen Merah/Rose):
       - Header kotak: "Daftar Alokasi RAB (WBS Terkait)" dengan badge count item.
       - Tabel/List interaktif: Nama Material, Qty RAB, Satuan, dan Subtotal (format Rupiah Indonesia).
       - Highlight visual saat baris diklik/disorot (border rose/red, background rose-500/10).
    3. Panel Kontrol Tengah (Transfer Buttons):
       - Tombol `<<` (Pindahkan ke Permintaan) dengan state aktif jika ada `highlightedSourceId`.
       - Tombol `>>` (Kembalikan ke Daftar RAB) dengan state aktif jika ada `highlightedTargetId`.
    4. Kolom Kiri (Permintaan Siap Submit - Aksen Hijau Muda/Emerald):
       - Header kotak: "Daftar Permintaan Material (Siap Ajukan)" dengan tombol "+ Add Item" untuk material ekstra di luar RAB.
       - Form list/tabel interaktif: Nama Material, Qty yang diminta (input number step 0.01), Satuan, Subtotal estimasi, dan tombol remove.
       - Highlight visual saat baris disorot (border emerald/green, background emerald-500/10).
    5. Textarea catatan mandor (Notes) dan Ringkasan Total Estimasi Material yang diminta.
  </action>
  <verify>Tampilan modal terbagi menjadi 2 kolom rapi dengan kontrol transfer di tengah, highlight seleksi jelas, dan input Qty responsif.</verify>
  <done>UI Dual-List Transfer Box selesai sesuai spesifikasi visual yang diminta.</done>
</task>

<task type="auto">
  <name>Task 3: Integrasi Submit Requisition, Validasi Transaksi, dan Verifikasi Build</name>
  <files>src/components/MaterialRequisitionForm.tsx</files>
  <action>
    1. Pastikan validasi saat submit: minimal 1 item terpilih dengan `quantity > 0` dan `materialId` valid.
    2. Simpan master requisition ke tabel `material_requisitions` (`spk_id`, `wbs_category`, `requested_by`, `notes`, `status: 'PENDING'`).
    3. Simpan rincian item ke tabel `material_requisition_items` (`requisition_id`, `material_id`, `quantity`).
    4. Tampilkan pesan feedback sukses, panggil `onClose()`, dan sediakan feedback error jika query gagal.
    5. Jalankan `npm run build` dan `npx oxlint` untuk memastikan zero type error dan lint passing.
  </action>
  <verify>Submit requisition berhasil masuk ke Supabase dengan status PENDING dan build lulus 100% tanpa error.</verify>
  <done>Alur end-to-end terverifikasi dan kode bersih dari error.</done>
</task>
