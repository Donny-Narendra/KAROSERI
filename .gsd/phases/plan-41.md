---
phase: 41
plan: refactor-rab-multi-wbs-matrix
wave: 4
gap_closure: true
---

# Fix: Matriks Alokasi Multi-WBS pada Penambahan Item Manual RAB

## Problem
Formulir "Add Estimation Item" saat ini menggunakan *dropdown* (single-select) untuk menentukan kategori WBS. Pendekatan ini tidak memadai karena kenyataan di lapangan, satu item spesifik (seperti bahan cat, dempul, dempul plastik, atau mur-baut) sering kali dialokasikan dan didistribusikan ke dalam beberapa tahap WBS sekaligus dalam porsi pecahan/desimal. Akibatnya, estimator harus menambahkan item yang sama secara berulang-ulang dari awal hanya untuk memisahkannya ke beberapa tahapan WBS yang berbeda.

## Root Cause
- Komponen `RabCalculator.tsx` untuk tambah item manual dirancang mengusung prinsip "Satu Item = Satu WBS" dari state yang dikontrol dropdown `wbsCategory`.

## Tasks

<task type="auto">
  <name>Implementasi Matriks Multi-WBS</name>
  <files>src/components/RabCalculator.tsx</files>
  <action>
    1. **State Update**: Ganti state `wbsCategory` tunggal menjadi state alokasi objek/array (`wbsAllocations`), misalnya `{ 'Pembongkaran': 0, 'Sasis/Rangka': 0.5, ... }`.
    2. **UI Update**: Hapus *dropdown* WBS Category dari tampilan UI. Ganti dengan grid atau tabel matriks (seperti pada PackageAllocationModal) yang berisi label komponen, Total Qty (dari field `qty`), kolom input pecahan (`type="number" step="any"`) untuk setiap tahap WBS, dan indikator sisa kuota (badge "PASSED", "Sisa: X", atau "Over: X").
    3. **Validasi Disable Button**: Tombol "Add Item" (Submit) hanya aktif (`disabled={!isPassed}`) bila nilai total kuota (`qty`) dan akumulasi alokasi yang dimasukkan bernilai seimbang (selisih === 0 atau mendekati 0 untuk toleransi desimal, misal `Math.abs(remaining) < 0.001`).
    4. **Handle Add**: Saat ditekan "Add Item", pisahkan item tersebut menjadi *beberapa record* `RabItem` yang masing-masing merepresentasikan porsi dari alokasi WBS. Misalnya, jika "Dempul" (total = 10) dialokasikan 2 ke WBS 1 dan 8 ke WBS 4, maka `items` ditambahkan dua objek terpisah.
    5. **Handle Edit**: (Opsional jika terlalu kompleks untuk satu klik) Sesuaikan mekanisme "Edit" item di form. Karena item sekarang terpecah, pastikan bila diedit, bisa disatukan kembali di matriks atau setidaknya hanya diedit per baris saja.
  </action>
  <verify>
    Skenario pengujian:
    - Buka halaman `/service-advisor`, masuk ke RAB Calculator.
    - Pada form Add Item, pilih Material, input Total Qty = 1.
    - Isi WBS 1: 0.2 dan WBS 3: 0.8. Sisa kuota menunjukkan `PASSED`.
    - Klik Add Item, pastikan 2 item terpisah tercatat di tabel ringkasan (WBS 1 Qty 0.2, WBS 3 Qty 0.8) dengan subtotal yang proporsional.
    - Coba alokasikan lebih (WBS 1 = 1.5), pastikan muncul *badge* merah dan tombol tersumbat.
    - Build (`npm run build`) dan linting (`npx oxlint`) tanpa error.
  </verify>
  <done>
    Penambahan item manual telah dimodernisasi menggunakan input alokasi multi-WBS yang akurat, fleksibel dengan nilai desimal, dan mampu memvalidasi perhitungan ketersediaan kuota.
  </done>
</task>
