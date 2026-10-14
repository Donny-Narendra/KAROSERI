---
phase: 72
plan: pagination-mandor-requisitions-warehouse
wave: 1
gap_closure: true
---

# Gap Closure: Menambahkan Pagination pada Daftar "Pending Requisitions (Mandor)" di Tab Mandor Requests (/warehouse)

## Problem
1. Pada halaman `/warehouse` tab "Mandor Requests", kartu daftar antrean permintaan material ("Pending Requisitions (Mandor)") sebelumnya me-render seluruh permintaan secara vertikal sekaligus dalam satu kontainer panjang.
2. Ketika sebuah SPK memiliki banyak permintaan tertunda (misal: SPK-5902 memiliki 13 pending requisitions, atau saat memilih "Semua SPK" dengan total 17 antrean), daftar menjadi sangat panjang ke bawah dan menyulitkan petugas gudang dalam memproses approval/rejection secara teratur.
3. Petugas gudang memerlukan navigasi paginasi (Pagination) di bagian bawah daftar kartu antrean agar data dapat ditinjau dan diproses secara bertahap (3, 5, atau 10 kartu per halaman).

## Root Cause
1. Belum ada state pemotongan data (*client-side pagination*) pada komponen `RequisitionApproval.tsx`.
2. Komponen sebelumnya langsung melakukan mapping dari array lengkap `filteredRequisitions.map(...)` tanpa memotong berdasarkan `startIndex` dan `itemsPerPage`.
3. Belum ada bilah navigasi paginasi yang menyediakan tombol navigasi cepat (`Pertama`, `Sebelumnya`, `Berikutnya`, `Terakhir`), indikator halaman aktif, dan pemilih jumlah baris kartu per halaman.

## Tasks

<task type="auto">
  <name>Task 1: Implementasi State Paginasi & Slicing di RequisitionApproval.tsx</name>
  <files>src/components/RequisitionApproval.tsx</files>
  <action>
    - Tambahkan state `currentPage` (default: 1) dan `itemsPerPage` (default: 5).
    - Tambahkan efek reset: setiap kali filter SPK `selectedSpkFilter` berubah, otomatis kembalikan `currentPage` ke 1.
    - Tambahkan efek penyesuaian: jika aksi approval/rejection mengurangi jumlah data hingga `currentPage > totalPages`, otomatis sesuaikan `currentPage` ke `totalPages`.
    - Hitung `totalItems = filteredRequisitions.length`, `totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))`, dan `startIndex = (currentPage - 1) * itemsPerPage`.
    - Buat `paginatedRequisitions` dengan memoized slicing `filteredRequisitions.slice(startIndex, startIndex + itemsPerPage)`.
    - Ubah mapping kartu antrean agar me-render `paginatedRequisitions.map(...)`.
  </action>
  <verify>Kartu antrean permintaan material terbagi menjadi subset halaman sesuai itemsPerPage tanpa kehilangan reaktivitas filter SPK.</verify>
  <done>State paginasi dan pemotongan slice berhasil diimplementasikan di RequisitionApproval.tsx.</done>
</task>

<task type="auto">
  <name>Task 2: Desain Kontrol Navigasi Paginasi Dark Industrial RobelKaroseri</name>
  <files>src/components/RequisitionApproval.tsx</files>
  <action>
    - Import ikon navigasi `ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight` dari `lucide-react`.
    - Letakkan bilah kontrol paginasi di bawah kontainer daftar kartu (`border-t border-border bg-surface-hover/50`).
    - Sisi Kiri:
      * Teks ringkasan informasi: "Menampilkan {startIndex + 1} - {Math.min(startIndex + itemsPerPage, totalItems)} dari {totalItems} Permintaan".
      * Dropdown pemilih ukuran halaman ("Per hal: 3, 5, 10").
    - Sisi Kanan:
      * Tombol `<< Pertama` (disabled jika `currentPage === 1`).
      * Tombol `< Sebelumnya` (disabled jika `currentPage === 1`).
      * Indikator halaman aktif: "Halaman {currentPage} dari {totalPages}".
      * Tombol `Berikutnya >` (disabled jika `currentPage === totalPages` atau data kosong).
      * Tombol `Terakhir >>` (disabled jika `currentPage === totalPages` atau data kosong).
    - Terapkan styling tombol dark mode konsisten: `bg-slate-800 text-slate-300 hover:bg-slate-700 active:bg-primary border border-slate-700 rounded-md`.
  </action>
  <verify>Bilah navigasi paginasi tampil rapi, responsif, dan tombol disable berfungsi tepat pada halaman awal maupun akhir.</verify>
  <done>Bilah kontrol paginasi berhasil dirancang dan diintegrasikan di RequisitionApproval.tsx.</done>
</task>
