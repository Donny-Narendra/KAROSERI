---
phase: 25
plan: 1
wave: 1
---

# Plan 25.1: Backend Endpoint Backup & Restore (In-Memory Streaming)

## Objective
Membuat fungsi backend/endpoint HTTP untuk melakukan ekspor (Backup) dan impor (Restore) database menggunakan in-memory streaming agar bebas residu file di server (`Zero Residu Server`).

## Context
- Kebutuhan teknis Backup dan Restore dengan `zlib.createGzip()` dan `zlib.createGunzip()`.
- Batasan akses: Hanya session yang tervalidasi dengan role `owner` dari Supabase Auth.
- Format File: `.sql.gz`.

## Tasks

<task type="auto">
  <name>Implementasi Endpoint/Fungsi Backup Streaming</name>
  <files>
    supabase/functions/backup/index.ts
  </files>
  <action>
    - Buat Supabase Edge Function (atau Node.js endpoint) baru untuk path `/backup`. (Catatan: Jika menggunakan Deno Edge Functions, impor `node:zlib` atau manfaatkan `CompressionStream`. Jika menggunakan Node.js Express server terpisah, gunakan `zlib.createGzip()`).
    - Verifikasi JWT token dari header `Authorization` melalui Supabase Auth dan pastikan user tersebut memiliki role `owner`.
    - Lakukan streaming dump seluruh skema data operasional: tabel profil user/role, unit kendaraan, SPK, tahapan WBS, konsumsi bahan baku/jasa, dan tagihan/faktur.
    - Piping hasil SQL stream langsung melalui gzip encoder ke response body HTTP. 
    - Set response header: `Content-Type: application/gzip` dan `Content-Disposition: attachment; filename="karoseriops-backup-YYYY-MM-DD-HHmm.sql.gz"`.
    - Dilarang menyimpan file sementara `.sql` atau `.sql.gz` ke disk server (`/tmp` atau filesystem).
  </action>
  <verify>Dapat dieksekusi dengan mock request dan response me-return tipe application/gzip.</verify>
  <done>Endpoint mengembalikan file stream `.sql.gz` tanpa meninggalkan residu file di disk.</done>
</task>

<task type="auto">
  <name>Implementasi Endpoint/Fungsi Restore Streaming</name>
  <files>
    supabase/functions/restore/index.ts
  </files>
  <action>
    - Buat Supabase Edge Function (atau Node.js endpoint) baru untuk path `/restore` dengan method POST (Multipart FormData payload upload).
    - Verifikasi JWT token role `owner`.
    - Baca file upload `.sql.gz` dari payload request lalu lewati `zlib.createGunzip()` (atau `DecompressionStream`).
    - Alirkan (stream/buffer chunking) hasil SQL plaintext dan jalankan ke database PostgreSQL sebagai *Single Transaction* (`BEGIN ... COMMIT / ROLLBACK`).
    - Set pengaturan urutan *Foreign Key constraints*: gunakan `SET session_replication_role = 'replica';` sebelum restore, lalu kembalikan ke `origin` setelah sukses (jika didukung).
    - Dilarang keras menulis file `.sql.gz` atau `.sql` hasil ekstrak ke disk server.
  </action>
  <verify>Dapat dieksekusi dan me-return response success jika file valid.</verify>
  <done>Endpoint berhasil memulihkan database dari upload gzip dalam satu transaksi tanpa residu file lokal.</done>
</task>
