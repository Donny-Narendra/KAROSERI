## Current Position
- **Phase**: 65 (Gap Closure: Sinkronisasi Tampilan Data Requisition Lintas Role dan Resolusi Pelanggaran RLS Minta Material untuk Service Advisor)
- **Task**: All tasks complete (awaiting manual review, test, & git commit by user)
- **Status**: Implemented & Ready for Manual Verification

## Last Session Summary
Phase 65 telah selesai diimplementasikan sesuai seluruh spesifikasi dan batasan instruksi pengguna:
1. `supabase/migrations/20261012_sync_requisitions_rls_for_service_advisor.sql`:
   - Dibuat skrip DDL SQL lengkap untuk memperbarui policy RLS pada tabel `public.material_requisitions` dan `public.material_requisition_items`.
   - Membersihkan seluruh policy lama yang restriktif (Owners, Mandor, Gudang) untuk mencegah konflik atau filter sepihak.
   - Memberikan hak akses `SELECT`, `INSERT`, `UPDATE`, dan `DELETE` bagi peran `service_advisor`, `mandor`, `petugas_gudang`, `owner`, dan `admin`.
   - Menggunakan mekanisme pengecekan ganda: via klaim JWT (`auth.jwt() ->> 'role'`) dan tabel profil pengguna (`profiles.role`).
   - Memastikan kueri `SELECT` bersifat terbuka bagi staf berwenang membaca requisition aktif berdasarkan `spk_id` dan tahapan WBS (tanpa filter sepihak `created_by = auth.uid()`).
2. `src/components/MaterialRequisitionForm.tsx`:
   - Sinkronisasi kueri Supabase di `loadInitialData`: Mengambil seluruh requisition aktif pada SPK terkait dengan menyaring `.neq('status', 'CANCELLED').neq('status', 'REJECTED')`.
   - Penambahan toleransi pencocokan kategori WBS menggunakan normalisasi teks (`normalizeText(reqCat) === normalizeText(cleanWbsCategory)`) dan penanganan error kueri yang transparan.
   - Rendering kotak kiri ("Daftar Permintaan Material"): Menampilkan seluruh item tersimpan lengkap dengan nama, kuantitas, dan badge status `TERCATAT` (atau `DISETUJUI`).
   - Sinkronisasi panel kanan ("Alokasi RAB (WBS Terkait)"): Mengecualikan material yang sudah diajukan di requisition atau sedang ditugaskan di SPK Borongan, serta menampilkan pesan informatif saat semua material telah dipindahkan: *"Semua material telah dipindahkan: Seluruh item RAB untuk tahapan WBS ini sudah berada di daftar permintaan atau sedang ditugaskan di SPK Borongan."*
   - Penyesuaian payload `handleSubmit`: Menyertakan `requested_by: user.id` (`auth.uid()`) dan memetakan `material_id` UUID master material secara defensif terhadap katalog `materials`.
3. `src/components/SpkBoronganPanel.tsx`:
   - Sinkronisasi kueri eksklusi material requisition dengan menambahkan `.neq('status', 'CANCELLED')` agar konsisten mengecualikan status CANCELLED dan REJECTED.
4. Kepatuhan Batasan & Quality:
   - Tanpa verifikasi otomatis (no auto-verify).
   - Tanpa git commit otomatis (no auto-commit).
   - Tanpa eksekusi langsung migrasi Supabase (skrip migrasi siap dieksekusi secara manual oleh pengguna di SQL Editor Supabase).

## Blockers
None.

## Next Steps
1. Pengguna membuka Supabase Dashboard -> SQL Editor dan mengeksekusi skrip migrasi `supabase/migrations/20261012_sync_requisitions_rls_for_service_advisor.sql`.
2. Pengguna login sebagai `service_advisor`, membuka menu "WBS & QC" pada SPK aktif (misal SPK-1452 tahapan Pembongkaran), dan mengklik tombol "Minta Material".
3. Pengguna memastikan bahwa material yang telah diminta sebelumnya oleh Mandor kini tampil di kotak kiri ("Daftar Permintaan Material") dengan badge `TERCATAT`, dan material tersebut tidak lagi muncul di panel kanan ("Alokasi RAB").
4. Pengguna memindahkan material baru dari RAB atau menambahkan item ekstra lalu mengklik "Submit Requisition", memastikan proses penyimpanan berhasil tanpa pelanggaran RLS.
5. Pengguna melakukan review visual, pengujian manual, dan git commit.
