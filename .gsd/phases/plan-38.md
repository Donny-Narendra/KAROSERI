---
phase: 38
plan: fix-restock-modal-ux
wave: 1
gap_closure: true
---

# Fix: Perbaikan UX dan Alur Modal Restock Material

## Problem
Berdasarkan temuan:
1. Modal langkah 1 (pencarian material) memiliki kontainer yang terlalu pendek, menyebabkan dropdown autocomplete terpotong dan tidak bisa di-scroll dengan keyboard/mouse.
2. Ketika material dipilih dari hasil pencarian, nama material tidak ter-passing/terisi dengan benar ke field material di langkah pengisian penambahan.
3. Saat dibatalkan (klik 'Batal' atau 'X') lalu tombol Restock diklik kembali, modal langsung melompat ke langkah pengisian dengan sisa data material sebelumnya (state kotor / tidak ter-reset).

## Root Cause
- Penggunaan dua modal terpisah (atau pergantian step state yang tidak mereset state).
- Dropdown autocomplete tidak di-styling dengan absolute position dan scrollable container.
- Tidak ada event listener keyboard yang memadai.
- Handler reset/close tidak menghapus state seperti `selectedMaterial`, `searchQuery`, `addedQuantity`, dan `notes`.

## Tasks

<task type="auto">
  <name>Fix Restock Modal UI and State</name>
  <files>src/pages/WarehouseDashboard.tsx, src/components/MaterialRestockModal.tsx</files>
  <action>
1. Refactor Modal Restock Material menjadi single modal (gabungkan pencarian dan pengisian).
2. Perbaiki CSS dropdown autocomplete dengan max-h-60 overflow-y-auto, position absolute, z-index 50.
3. Tambahkan navigasi keyboard (ArrowDown/Up/Enter/Escape) pada dropdown autocomplete.
4. Pastikan nama material yang dipilih tampil pada field baca saja/disabled atau bagian atas modal.
5. Buat fungsi resetForm() yang me-reset semua state (selectedMaterial, searchQuery, addedQuantity, notes) dan panggil fungsi ini saat modal ditutup (Batal, close button, atau onSuccess).
6. Tambahkan pengecekan TypeScript (oxlint & tsc) agar tidak ada error.
  </action>
  <verify>Buka modal Restock, cari item dengan keyboard, pilih item, batalkan modal, lalu buka kembali. Pastikan state bersih. Pastikan input bekerja baik.</verify>
  <done>Konsolidasi UI menjadi 1 modal, keyboard navigation berfungsi, state reset sempurna, tidak ada TS errors.</done>
</task>
