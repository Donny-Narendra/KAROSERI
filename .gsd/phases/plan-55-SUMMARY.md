# Phase 55 Summary: Persistensi Daftar Permintaan Material dan Dialog Konfirmasi Pengembalian di Mandor

## Hasil Eksekusi & Bukti Empiris

1. **Hydration / Persistensi Daftar Permintaan Material di Kotak Kiri**:
   - Menambahkan pelacakan persistensi pada `RequisitionItem`: `isPersisted`, `dbRequisitionItemId`, `dbRequisitionId`, dan `status`.
   - Pada saat inisialisasi modal (`loadInitialData()`), seluruh record `material_requisitions` aktif beserta item-itemnya di-query dari Supabase dan dipetakan ke dalam `selectedItems`.
   - Kotak Kiri ("Daftar Permintaan Material") kini menampilkan riwayat lengkap material yang telah diajukan lengkap dengan Nama Material, Kuantitas, Satuan, dan badge status (`DIAJUKAN` / `PENDING`).
   - Counter badge pada header Kotak Kiri otomatis merefleksikan total item yang ada.
   - Input kuantitas untuk item yang berstatus sudah tersimpan (`isPersisted: true`) dibuat read-only/terkunci untuk mencegah perubahan sepihak tanpa re-pengajuan formal.

2. **Dialog Konfirmasi Pembatalan & Pengembalian ke RAB**:
   - Dibuat custom in-app confirmation modal yang elegan (`confirmItemToRemove`), dipasang pada:
     - Tombol hapus (ikon tong sampah) per baris item.
     - Tombol transfer tengah `>>`.
     - Event double-click pada item di Kotak Kiri.
   - Pesan konfirmasi: *"Apakah Anda yakin ingin membatalkan permintaan material [{nama_material}]? Material akan dikembalikan ke daftar Alokasi RAB."*
   - Pada saat pengguna mengonfirmasi ("Ya, Kembalikan"):
     - Record `material_requisition_items` dihapus dari Supabase (dan header dibersihkan jika tidak memiliki sisa item).
     - ID terkait dihapus dari `usedRequisitionItemIds` dan `selectedItems`.
     - Melalui reaktivitas `useMemo` pada `availableItems`, material tersebut secara otomatis dan langsung kembali tampil di Kotak Kanan ("Alokasi RAB").

3. **Penyempurnaan Submit Requisition**:
   - `handleSubmit` hanya memproses item baru yang belum tersimpan (`!item.isPersisted`).
   - Tombol submit menampilkan jumlah item baru yang siap diajukan (misal: `Submit Requisition (1 baru)`), dan otomatis beralih ke state `Semua Item Diajukan` (disabled) jika semua item dalam list sudah tersimpan.

4. **Verifikasi & Build Validation**:
   - `npx oxlint`: 0 error.
   - `npm run build`: 100% sukses tanpa error kompilasi TypeScript maupun bundler Vite (478ms).
   - Pengujian integrasi database riil (`scratch/test_persist_and_remove.cjs`):
     - Insersi requisition dan item pengujian berhasil.
     - Query hydration saat simulasi buka modal berhasil memuat data persisted item.
     - Eksekusi pembatalan dan penghapusan record di Supabase sukses, membersihkan parent header dan mengembalikan item ke pool RAB.

5. **Commit Git**:
   - `feat(mandor): persist requisition items list and add confirmation dialog on item removal` (commit `ec12c30`)
