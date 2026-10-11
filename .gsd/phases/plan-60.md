---
phase: 60
plan: fix-replace-native-confirm-with-custom-modal-service-advisor
wave: 1
gap_closure: true
---

# Fix: Mengganti Seluruh Dialog Konfirmasi Native Peramban Menjadi Modal Custom di Halaman /service-advisor

## Problem
Pada halaman `/service-advisor`, tindakan operasional krusial seperti penghapusan baris item RAB, notifikasi penyimpanan estimasi RAB, persetujuan/penolakan Change Orders, dan penghapusan foto kendaraan dari galeri check-in masih memanggil dialog peramban native (`confirm()` / `alert()`) atau menggunakan modal ad-hoc yang tidak konsisten dengan tema dark industrial `ConfirmationModal`.
Jika peramban mengaktifkan proteksi "Jangan tampilkan pesan ini lagi", dialog bawaan akan dicekal sehingga interaksi Service Advisor terhenti.

## Root Cause
1. `src/components/spk/SpkGalleryModal.tsx` memanggil `confirm('Apakah Anda yakin ingin menghapus foto ini?')` secara sinkron langsung di handler `handleDelete`.
2. `src/components/RabCalculator.tsx` memanggil `alert('SPK ID is missing')`, `alert('Estimation saved successfully!')`, dan `alert('Failed to save estimation: ' + err.message)` pada `handleSaveEstimation`. Selain itu, dialog konfirmasi hapus item RAB menggunakan markup raw `div` ad-hoc alih-alih `ConfirmationModal`.
3. `src/components/AmendmentManager.tsx` langsung mengeksekusi `approveAmendment` atau `rejectAmendment` saat tombol ditekan tanpa konfirmasi pengaman bagi Service Advisor/Owner.
4. Perlu standarisasi state modal konfirmasi yang terpadu agar mutasi Supabase hanya dieksekusi saat pengguna menekan tombol konfirmasi di modal.

## Tasks

<task type="auto">
  <name>Task 1: Refactor SpkGalleryModal ke ConfirmationModal</name>
  <files>src/components/spk/SpkGalleryModal.tsx</files>
  <action>
    - Ganti `confirm('Apakah Anda yakin ingin menghapus foto ini?')` dengan state-driven `ConfirmationModal`.
    - Simpan `photoToDelete` di state lokal saat tombol ikon sampah diklik.
    - Tampilkan modal konfirmasi dengan varian 'danger' dan tombol konfirmasi yang jelas.
    - Jalankan mutasi delete Supabase hanya setelah konfirmasi disetujui.
    - Sediakan feedback error/sukses terstandarisasi.
  </action>
  <verify>Tidak ada pemanggilan `confirm(` atau `alert(` di `SpkGalleryModal.tsx`.</verify>
  <done>SpkGalleryModal menggunakan `ConfirmationModal` sepenuhnya.</done>
</task>

<task type="auto">
  <name>Task 2: Refactor RabCalculator ke ConfirmationModal</name>
  <files>src/components/RabCalculator.tsx</files>
  <action>
    - Ganti markup ad-hoc modal konfirmasi hapus item RAB dengan `ConfirmationModal` (`variant: 'danger'`).
    - Ganti seluruh pemanggilan `alert(...)` (SPK ID missing, Estimation saved successfully, Failed to save estimation) dengan modal notifikasi custom (`hideCancel: true`).
    - Pastikan mutasi data dan state update tetap akurat dan sinkron dengan Supabase.
  </action>
  <verify>Tidak ada pemanggilan `alert(` atau `confirm(` di `RabCalculator.tsx`.</verify>
  <done>RabCalculator sepenuhnya menggunakan `ConfirmationModal` terstandarisasi.</done>
</task>

<task type="auto">
  <name>Task 3: Refactor AmendmentManager ke ConfirmationModal</name>
  <files>src/components/AmendmentManager.tsx</files>
  <action>
    - Tambahkan modal konfirmasi untuk aksi Approve (`variant: 'info'`) dan Reject (`variant: 'danger'`) Change Order.
    - Hubungkan eksekusi `spkService.approveAmendment` dan `spkService.rejectAmendment` ke modal konfirmasi state-driven.
    - Tampilkan feedback error atau sukses secara terintegrasi.
  </action>
  <verify>Aksi Change Orders memiliki dialog konfirmasi custom tanpa native alert/confirm.</verify>
  <done>AmendmentManager terproteksi dengan konfirmasi modal.</done>
</task>

<task type="auto">
  <name>Task 4: Audit dan Integrasi ServiceAdvisorDashboard</name>
  <files>src/pages/ServiceAdvisorDashboard.tsx</files>
  <action>
    - Periksa seluruh alur di ServiceAdvisorDashboard.
    - Pastikan tidak ada `window.confirm` atau `window.alert` di seluruh halaman Service Advisor.
    - Verifikasi keselarasan dark mode industri RobelKaroseri.
  </action>
  <verify>Pemeriksaan linter dan build tidak menemukan error atau pemanggilan native dialog.</verify>
  <done>Halaman /service-advisor bersih dari native dialogs.</done>
</task>
