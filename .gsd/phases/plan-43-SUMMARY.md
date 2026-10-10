# Summary: Cetak Surat Tugas SPK Borongan dengan Nomor Surat Resmi

## Completed Tasks
- Dibuat script migrasi database `20261010202000_add_assignment_letter_no.sql` untuk kolom `assignment_letter_no` pada tabel `spk_borongan`.
- Mengimplementasikan `fetchSpkDetail` pada komponen `SpkBoronganPanel.tsx` untuk mendapatkan `spk_no`, `customer_name`, dan `vehicle_plate`.
- Mengimplementasikan fitur generator nomor surat otomatis dengan format `ST-BORONG/{spk_no}/{wbs_code}/{counter}`.
- Memperbarui logic tombol "Cetak" untuk melakukan update `assignment_letter_no` ke database Supabase secara persisten jika belum ada.
- Menyesuaikan template cetak HTML untuk mencetak dokumen resmi "Surat Tugas Pengerjaan Borongan" sesuai spesifikasi print view (kertas A4, styling bersih dengan elemen yang tidak terpotong).
- Verifikasi build dengan `npm run build` dan linter dengan `npx oxlint` berhasil lolos tanpa error.
- Melakukan git commit atomik untuk perubahan tersebut.
