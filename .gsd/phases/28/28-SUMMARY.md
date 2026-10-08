# Phase 28 Summary: Upload Foto 360° Langsung dari Modal Galeri SPK

## Completed Tasks
1. **Implementasi UI Upload di Modal & Integrasi Cloudinary/Supabase**
   - Merombak `SpkGalleryModal.tsx` dengan penambahan fitur drag-and-drop / select file native menggunakan `<input type="file">`.
   - Mengimplementasikan `compressImage` pada client-side sebelum upload menggunakan canvas.
   - Menggunakan fetch API untuk direct upload unsigned ke endpoint Cloudinary, dipisah per SPK ke folder unik `karoseriops/spk_{spk_no}`.
   - Melakukan insert ke Supabase `spk` tabel kolom `vehicle_photos` dengan penggabungan data lama.
   - Menambahkan prop `onPhotoAdded` dan memanggilnya sehingga `ServiceAdvisorDashboard.tsx` bisa me-render ulang list SPK dan modal gallery secara otomatis (seamless update tanpa penutupan modal).

## Decisions Made
- Karena ini upload tambahan, angle dilabeli secara otomatis dengan `Tambahan [RANDOM_4_CHAR]` untuk membedakan dengan foto wajib (depan, belakang, dsb).
- Menghindari modifikasi berlebihan pada `CloudinaryUploader` yang secara default mengunci 5 angle; membuat instance khusus uploader di dalam modal Galeri untuk kepraktisan pengguna.

## Verification
- File TypeScript tidak mengalami error (`npx tsc --noEmit` lulus).
- Flow callback telah terpasang dengan benar di sisi Dashboard untuk auto-refresh state.
