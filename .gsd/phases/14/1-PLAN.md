---
phase: 14
plan: 1
wave: 1
depends_on: []
files_modified:
  - "src/components/MaterialAutocomplete.tsx"
  - "src/components/PackageManager.tsx"
autonomous: true
user_setup: []
must_haves:
  truths:
    - "Pengguna dapat mencari material melalui input text dengan suggestion dropdown"
    - "Pengguna dapat bernavigasi menggunakan Arrow Up, Arrow Down, dan memilih dengan Enter"
    - "Material yang dipilih akan mengisi row BOM dengan data ID dan cost secara tepat"
  artifacts:
    - "Komponen MaterialAutocomplete baru yang bisa di-reuse"
---

# Plan 14.1: Implementasi Fitur Search Autocomplete Keyboard-Navigated untuk Pemilihan Bahan Material pada Modal BOM

<objective>
Mengganti elemen `<select>` standar dengan search autocomplete interaktif (didukung navigasi keyboard) untuk memudahkan pengguna mencari dan memilih material saat merakit Paket Barang Jadi (BOM).
Purpose: Mempercepat dan mempermudah proses pembuatan BOM, khususnya ketika jumlah material di database sangat banyak.
Output: Komponen baru `MaterialAutocomplete.tsx` terintegrasi dengan `PackageManager.tsx`.
</objective>

<context>
Load for context:
- `src/components/PackageManager.tsx`
- `src/services/inventoryService.ts`
</context>

<tasks>

<task type="auto">
  <name>Buat komponen MaterialAutocomplete dengan keyboard navigation</name>
  <files>src/components/MaterialAutocomplete.tsx</files>
  <action>
    Buat komponen reusable `MaterialAutocomplete.tsx`:
    - Props: `materials: Material[]`, `onSelect: (material: Material) => void`, `placeholder?: string`, `initialValue?: string`.
    - State: `query: string`, `isOpen: boolean`, `highlightedIndex: number`.
    - Filter bahan baku (case-insensitive).
    - Event handler `onKeyDown` pada input teks: ArrowUp, ArrowDown, Enter (pilih dan `e.preventDefault()`), dan Escape (tutup dropdown).
    - Gunakan `useRef` untuk handle `scrollIntoView` agar list tersorot otomatis jika list panjang.
    - Event `onClick` pada dropdown item dan `onBlur` pada input dengan `setTimeout` (agar `onClick` pada item tidak hilang karena input blur lebih dulu).
    - Tampilkan nama material, stok (`current_stock`), dan unit di baris suggestion.
    - Highlight UI pada baris yang aktif (`highlightedIndex`).
    AVOID: Menggunakan z-index yang tertutup oleh modal pembungkusnya (gunakan z-index cukup tinggi atau absolute positioning tepat di bawah input).
  </action>
  <verify>Jalankan `npm run build` dan pastikan tidak ada error kompilasi TypeScript.</verify>
  <done>Komponen MaterialAutocomplete siap digunakan dengan interaksi keyboard lengkap.</done>
</task>

<task type="auto">
  <name>Integrasikan MaterialAutocomplete ke modal Buat Paket Baru di PackageManager</name>
  <files>src/components/PackageManager.tsx</files>
  <action>
    Di `src/components/PackageManager.tsx` pada baris penambahan item tipe "Bahan Material" (item_type === 'MATERIAL'):
    - Hapus elemen `<select>` dropdown material.
    - Gantikan dengan `<MaterialAutocomplete materials={materials} onSelect={(material) => handleSelectMaterial(index, material)} />`.
    - Update `handleSelectMaterial` atau fungsi sejenis agar ketika terpilih, `material_id`, `cost_per_unit` (dan atribut UI seperti name) ter-set.
    - Pastikan input untuk komponen Jasa Tukang (item_type === 'LABOR') tetap berupa `<input type="text" ... />` biasa dan tidak terpengaruh.
    AVOID: Merusak kalkulasi `totalHPP` yang bergantung pada nilai cost yang baru.
  </action>
  <verify>Jalankan linting/build untuk verifikasi tidak ada error TS.</verify>
  <done>Pencarian bahan material pada paket BOM dapat dilakukan secara cepat via search autocomplete dan keyboard.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] MaterialAutocomplete merender dropdown pencarian.
- [ ] Navigasi ArrowUp/ArrowDown dan Enter berfungsi memilih material.
- [ ] Pemilihan material sukses meng-update cost dan ID pada row BOM PackageManager.
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>
