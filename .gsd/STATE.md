## Current Position
- **Phase**: 68 (Gap Closure: Void Recent Material Issue Mengembalikan Permintaan ke Tab Mandor Requests dan Menyesuaikan Stok Material di /warehouse)
- **Task**: Implementation completed (ready for manual review, SQL migration execution in Supabase SQL editor, manual test, & git commit by user)
- **Status**: Implemented & Ready for Manual Verification

## Last Session Summary
Phase 68 diimplementasikan secara komprehensif mengikuti seluruh rincian kebutuhan dan batasan instruksi pengguna:
1. `supabase/migrations/20261014_void_material_issue_rollback.sql`:
   - DDL penambahan kolom relasi `requisition_id UUID REFERENCES material_requisitions(id)`, `requisition_item_id UUID REFERENCES material_requisition_items(id)`, dan `status VARCHAR(20) DEFAULT 'ACTIVE'` pada tabel `public.inventory_transactions`.
   - DDL penambahan kolom `status VARCHAR(20) DEFAULT 'PENDING'` pada tabel `public.material_requisition_items`.
   - Dibuat fungsi database RPC atomik `public.void_material_issue(p_issue_id UUID)`:
     * Mengembalikan stok fisik pada tabel `materials` (`current_stock = current_stock + qty`).
     * Mencari relasi permintaan (baik via foreign key langsung maupun fallback SPK + material aktif).
     * Mengembalikan status item dan header pada `material_requisitions` menjadi `'PENDING'`.
     * Menghapus baris transaksi aktif pada `inventory_transactions` agar tidak terhitung lagi dalam riil biaya SPK.
   - Dibuat fungsi batch RPC `public.void_material_issues(p_issue_ids UUID[])`.
   - Pemberian izin eksekusi (`GRANT EXECUTE`) kedua fungsi RPC kepada peran `authenticated`.
2. `src/services/inventoryService.ts`:
   - Refactor method `deleteIssuesAndRevertStock` untuk memprioritaskan pemanggilan RPC `void_material_issues` dan `void_material_issue`.
   - Penyediaan fallback client-side yang andal jika pengguna menguji sebelum mengeksekusi migrasi di Supabase (mengembalikan stok fisik `materials`, mengembalikan status `material_requisition_items` dan `material_requisitions` ke `'PENDING'`, serta menghapus transaksi aktif).
3. `src/components/RecentMaterialIssues.tsx`:
   - Standarisasi dialog konfirmasi `ConfirmationModal`:
     * Judul: "Konfirmasi Void Pengeluaran Material"
     * Pesan: "Apakah Anda yakin ingin membatalkan pengeluaran material ini? Stok akan dikembalikan dan item ini akan muncul kembali di tab Permintaan Mandor untuk diapprove ulang."
     * Tombol: "Ya, Void Transaksi" (`variant: 'danger'`) dan "Batal".
   - Penambahan tombol aksi cepat void (ikon Trash) di kolom "Aksi" pada setiap baris tabel.
   - Penambahan props callback `onSuccess?: () => void` yang dipanggil setelah transaksi berhasil dibatalkan.
   - Feedback modal sukses informatif saat void berhasil dilakukan.
4. `src/pages/WarehouseDashboard.tsx`:
   - Penambahan kalkulasi dinamis `pendingReqCount` untuk antrean `material_requisitions` berstatus `PENDING`.
   - Penambahan badge counter peringatan pada tab button "Mandor Requests" (`[ {pendingReqCount} ]`).
   - Integrasi callback `onSuccess` dari `RecentMaterialIssues` ke `handleIssueSuccess` untuk memperbarui `refreshKey`, daftar peringatan stok menipis (`fetchMaterials`), dan counter badge `fetchPendingReqCount`.
   - Pengoperan `refreshKey` ke komponen `RequisitionApproval`.
5. `src/components/RequisitionApproval.tsx`:
   - Penerimaan props `refreshKey` pada `RequisitionApprovalProps` dan pemicuan re-fetch otomatis pada `useEffect([refreshKey])`.
   - Saat approval: mencatat relasi `requisition_id` dan `requisition_item_id` pada transaksi `inventory_transactions` serta mengurangi stok fisik `materials.current_stock` untuk menjaga keseimbangan inventaris fisik.
6. Kepatuhan Batasan:
   - Tanpa verifikasi otomatis (no auto-verify).
   - Tanpa git commit otomatis (no auto-commit).
   - Tanpa eksekusi otomatis migrasi Supabase (skrip SQL tersedia di `supabase/migrations/20261014_void_material_issue_rollback.sql` untuk dijalankan pengguna di SQL Editor Supabase).

## Blockers
None.

## Next Steps
1. Pengguna membuka Supabase Dashboard -> SQL Editor, lalu menyalin dan mengeksekusi isi skrip dari berkas:
   `supabase/migrations/20261014_void_material_issue_rollback.sql`
2. Pengguna login ke aplikasi dengan akun `petugas_gudang` atau `owner`.
3. Pengguna menuju halaman `/warehouse`:
   - Periksa tab "Mandor Requests": pastikan counter badge menampilkan jumlah permintaan `PENDING` (jika ada).
   - Lakukan approval pada salah satu permintaan mandor: amati transaksi pengeluaran baru tercatat di tabel "Recent Material Issues".
   - Pilih satu atau beberapa baris di tabel "Recent Material Issues", lalu klik tombol **Void Transaksi** (atau ikon tempat sampah di kolom Aksi).
   - Pastikan modal dialog custom (`ConfirmationModal`) muncul dengan judul "Konfirmasi Void Pengeluaran Material" dan pesan penjelasan pemulihan stok serta antrean.
   - Klik **Ya, Void Transaksi**: pastikan transaksi terhapus dari tabel issues, stok gudang bertambah kembali, dan permintaan tersebut langsung muncul kembali di tab "Mandor Requests" dengan counter badge yang bertambah.
4. Pengguna melakukan review kode, pengujian manual, dan git commit.
