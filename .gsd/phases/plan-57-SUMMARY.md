# Summary Phase 57: Refactor UI Modal Dialog Konfirmasi Custom di Halaman /mandor

## Ringkasan Eksekusi
Mengganti seluruh pemanggilan native dialog browser (`window.confirm()` dan `window.alert()`) di halaman `/mandor` dan seluruh subkomponennya menjadi komponen modal dialog kustom berbasis React UI. Hal ini mencegah terjadinya pemblokiran dialog oleh fitur peramban "Jangan tampilkan pesan ini lagi" yang dapat melumpuhkan aksi operasional mandor di tablet lapangan.

## Perubahan yang Dilakukan:
1. **Pembuatan Komponen Reusable `ConfirmationModal.tsx` (`src/components/ConfirmationModal.tsx`)**:
   - Mendukung properti: `isOpen`, `title`, `message`, `confirmText`, `cancelText`, `variant` (`'danger' | 'warning' | 'info' | 'success'`), `hideCancel` (mode dialog notifikasi/alert), `isLoading`, `children`, `onConfirm`, dan `onCancel`.
   - Menyesuaikan desain tema gelap industri RobelKaroseri (backdrop blur, border slate/kontras, ikon contextual Lucide React, tombol responsif beraksen warna, dan penutupan via tombol Escape).

2. **Refactor pada `SpkBoronganPanel.tsx` (`src/components/SpkBoronganPanel.tsx`)**:
   - Mengganti dialog `window.confirm` saat membatalkan / menghapus penugasan SPK Borongan dengan state modal `assignmentToCancel` (`variant: 'danger'`).
   - Mengganti dialog native `window.alert` (notifikasi sukses batal, gagal hapus, validasi progres cut-off 0-100%, error SPK-B, dan error penomoran surat tugas) dengan state `notification` modal.

3. **Standarisasi pada `MaterialRequisitionForm.tsx` (`src/components/MaterialRequisitionForm.tsx`)**:
   - Mengganti modal konfirmasi inline sebelumnya dengan komponen terpadu `<ConfirmationModal>` untuk aksi pembatalan / pengembalian material dari Daftar Permintaan Material ke Alokasi RAB.
   - Mengganti seluruh `window.alert()` pada submit requisition (sesi invalid, tidak ada item baru, validasi kuantitas > 0, material ekstra belum dipilih, dan notifikasi sukses pengajuan PENDING) dengan modal dialog custom.

4. **Refactor pada `WbsChecklist.tsx` (`src/components/WbsChecklist.tsx`)**:
   - Mengganti dialog `alert()` saat validasi 100% progres fisik (wajib minimal 1 foto bukti pengerjaan) dan saat penanganan error penyimpanan ke Supabase menjadi modal dialog custom.

5. **Refactor pada `QcInspectionForm.tsx` (`src/components/QcInspectionForm.tsx`)**:
   - Mengganti dialog `alert()` saat hasil inspeksi QC berhasil diajukan atau gagal disimpan menjadi modal notifikasi custom.

## Status Eksekusi:
- Kode selesai diimplementasikan 100%.
- Linter `npx oxlint`: 0 error.
- Build `npm run build`: Berhasil tanpa error.
- Tidak ada git commit otomatis yang dijalankan (sesuai instruksi: pengguna akan melakukan commit dan verifikasi secara manual).
