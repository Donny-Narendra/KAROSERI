---
phase: 42
plan: fix-dp-modal-layout
wave: 4
gap_closure: true
---

# Fix: Perbaikan Responsiveness Modal Terima DP di Kasir

## Problem
Pada halaman `/kasir`, dialog modal "Terima Uang Muka (DP)" tampil terlalu tinggi, terutama pada layar laptop dengan resolusi rendah atau aspect ratio tertentu. Hal ini menyebabkan tombol aksi ("Simpan Pembayaran & Aktifkan SPK" dan "Batal") serta header dari modal terpotong dan keluar dari jangkauan viewport, membuat Kasir kesulitan untuk menyelesaikan alur penerimaan DP.

## Root Cause
- Kontainer `DownPaymentModal.tsx` menggunakan layout standar (misalnya `max-h-full` tanpa pembatasan fleksibel yang tepat).
- Tidak ada separasi antara area statis (header dan footer aksi) dengan area yang dapat digulir (*scrollable body*).
- Margin dan padding (terutama di dalam ringkasan SPK dan antar input form) terlalu lebar, memakan ruang vertikal secara boros.

## Tasks

<task type="auto">
  <name>Perbaikan Layout dan Scrolling Modal Terima DP</name>
  <files>src/components/DownPaymentModal.tsx</files>
  <action>
    1. **Structural Flex Layout**: Pastikan *wrapper* modal utama (`<div className="bg-surface ...">`) di-set dengan `max-h-[90vh] flex flex-col`.
    2. **Sticky Header & Footer**:
       - *Header* (Judul & tombol X) perlu dikunci di atas. Karena sudah di dalam flex-col, pisahkan jadi `shrink-0`.
       - *Footer* (Tombol Batal & Simpan) juga dikunci: `shrink-0 p-4 border-t border-border bg-surface`.
    3. **Scrollable Body**:
       - *Body* (konten utama) dibuat bisa di-scroll: `flex-1 overflow-y-auto p-4` (atau custom scrollbar tipis).
    4. **Compact Spacing**:
       - Kurangi *padding* berlebih di dalam Summary Card (ubah `p-6` atau `p-4` menjadi `p-3`).
       - Ubah jarak *gap* formulir agar lebih padat (misal dari `gap-6` atau `space-y-6` ke `gap-4` atau `space-y-4`).
       - Turunkan `rows` textarea catatan dari default-nya ke `rows={2}`.
  </action>
  <verify>
    Skenario pengujian:
    - Masuk sebagai Kasir (`/kasir`), lihat daftar SPK yang membutuhkan DP.
    - Klik "Terima DP" untuk memicu `DownPaymentModal.tsx`.
    - Modal harus terlihat jelas dengan header dan footer terkunci di tempatnya.
    - Ketika layar dikecilkan, bagian isi formulir (*body*) harus bisa di-*scroll* secara vertikal, namun tombol "Simpan Pembayaran" harus tetap terlihat solid di bagian bawah layar.
    - `npm run build` dan `npx oxlint` lolos validasi.
  </verify>
  <done>
    Ketinggian modal "Terima Uang Muka (DP)" telah dibatasi maksimum `90vh`, dengan pemisahan *header*, area *scrollable*, dan *footer* aksi yang selalu terlihat (*sticky*), memastikan UX yang sempurna di berbagai resolusi layar.
  </done>
</task>
