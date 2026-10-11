---
phase: 57
plan: fix-replace-native-confirm-with-custom-modal-mandor
wave: 1
gap_closure: true
---

# Fix: Mengganti Seluruh Konfirmasi Native Browser Menjadi Modal Dialog Konfirmasi Custom di Halaman /mandor

## Problem
Di halaman `/mandor`, beberapa aksi pembatalan/penghapusan (misal: membatalkan penugasan SPK Borongan, menghapus/mengembalikan material dari Daftar Permintaan Material ke Alokasi RAB, dan notifikasi error/sukses form) masih menggunakan dialog bawaan browser (`window.confirm()` atau `window.alert()`). Jika pengguna tidak sengaja mencentang opsi peramban "Jangan tampilkan pesan ini lagi", peramban akan memblokir dialog konfirmasi seterusnya sehingga aksi mandor gagal berfungsi atau membingungkan pengguna di tablet lapangan.

## Root Cause
1. Pemanggilan native `window.confirm()` pada `SpkBoronganPanel.tsx` untuk konfirmasi pembatalan penugasan.
2. Pemanggilan native `window.alert()` pada `SpkBoronganPanel.tsx`, `MaterialRequisitionForm.tsx`, `WbsChecklist.tsx`, dan `QcInspectionForm.tsx` untuk validasi form, notifikasi sukses, dan pesan kesalahan.
3. Belum adanya komponen modal konfirmasi dialog React UI terstandarisasi (`ConfirmationModal.tsx`) yang dapat digunakan kembali lintas modul dengan styling dark theme industrial RobelKaroseri.

## Tasks

<task type="auto">
  <name>Task 1: Buat Komponen Reusable ConfirmationModal</name>
  <files>src/components/ConfirmationModal.tsx</files>
  <action>
    Buat komponen modal konfirmasi reusable dengan props:
    - isOpen: boolean
    - title: string
    - message?: string
    - confirmText?: string (default: "Ya, Lanjutkan")
    - cancelText?: string (default: "Batal")
    - variant?: 'danger' | 'warning' | 'info' | 'success'
    - hideCancel?: boolean (untuk alert dialog)
    - isLoading?: boolean
    - children?: React.ReactNode (untuk konten peringatan kustom)
    - onConfirm: () => void | Promise<void>
    - onCancel: () => void
    Desain selaras dark mode industri: backdrop blur, border slate/contrast, ikon kontekstual (AlertCircle/AlertTriangle/Info/CheckCircle), dan tombol responsif.
  </action>
  <verify>Komponen siap diimpor dan lulus kompilasi TypeScript.</verify>
  <done>ConfirmationModal.tsx tersedia di src/components/.</done>
</task>

<task type="auto">
  <name>Task 2: Refactor Titik Konfirmasi & Alert pada SpkBoronganPanel</name>
  <files>src/components/SpkBoronganPanel.tsx</files>
  <action>
    1. Ganti pemanggilan window.confirm(`Batalkan dan hapus penugasan...`) dengan state ConfirmationModal (variant danger).
    2. Ganti seluruh pemanggilan window.alert() (sukses batal, error batal, validasi progress cut-off, error create/surat tugas) dengan state notifikasi modal atau inline feedback.
  </action>
  <verify>Tidak ada lagi window.confirm atau window.alert di SpkBoronganPanel.tsx.</verify>
  <done>Seluruh alur pembatalan dan notifikasi di SpkBoronganPanel menggunakan modal custom.</done>
</task>

<task type="auto">
  <name>Task 3: Standarisasi Konfirmasi & Alert pada MaterialRequisitionForm</name>
  <files>src/components/MaterialRequisitionForm.tsx</files>
  <action>
    1. Ganti inline modal konfirmasi pengembalian material (lines 1013-1060) dengan komponen terstandarisasi ConfirmationModal.
    2. Ganti seluruh pemanggilan window.alert() saat submit requisition (sesi invalid, tidak ada item baru, validasi kuantitas, status PENDING sukses) dengan modal dialog custom.
  </action>
  <verify>Tidak ada lagi window.alert di MaterialRequisitionForm.tsx dan modal konfirmasi menggunakan ConfirmationModal.</verify>
  <done>MaterialRequisitionForm terstandarisasi dengan ConfirmationModal.</done>
</task>

<task type="auto">
  <name>Task 4: Refactor Alert pada WbsChecklist & QcInspectionForm</name>
  <files>src/components/WbsChecklist.tsx, src/components/QcInspectionForm.tsx</files>
  <action>
    1. Di WbsChecklist.tsx: Ganti alert validasi 100% foto wajib dan error simpan dengan modal peringatan custom.
    2. Di QcInspectionForm.tsx: Ganti alert submit QC sukses/gagal dengan modal feedback custom.
  </action>
  <verify>Seluruh subkomponen Mandor bebas dari dialog native browser.</verify>
  <done>Modul Mandor 100% bersih dari window.confirm dan window.alert.</done>
</task>
