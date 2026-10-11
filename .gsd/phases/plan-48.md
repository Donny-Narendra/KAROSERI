---
phase: 48
plan: fix-spk-borongan-rab-subtotal-column
wave: 1
gap_closure: true
---

# Fix: Menampilkan Kolom Subtotal RAB pada Panel "Panduan Material (RAB)" di Modal SPK Borongan

## Problem
Pada panel "Panduan Material (RAB)" di modal SPK Borongan (`src/components/SpkBoronganPanel.tsx`), yang diakses melalui `/service-advisor` maupun `/mandor`, tabel daftar material terencana saat ini hanya menampilkan 2 kolom: "Nama Material" dan "Qty". Service Advisor dan Mandor tidak dapat melihat estimasi nilai anggaran untuk setiap material atau jasa yang dialokasikan pada WBS tersebut secara langsung di modal, sehingga sulit membandingkan kesesuaian nilai borongan yang diajukan dengan pagu anggaran di RAB.

## Root Cause
1. Query pengambilan data `rab_items` di `fetchRabMaterials()` hanya menyeleksi kolom `id, quantity, wbs_category, description, materials(id, name, unit)`. Data harga seperti `item_total` atau `materials.unit_price` belum diambil.
2. Interface `RabMaterial` belum mendefinisikan kolom `item_total` atau `unit_price`.
3. Struktur tabel HTML pada panel "Panduan Material (RAB)" belum memiliki header dan sel kolom ketiga untuk menampilkan nilai Subtotal RAB yang diformat ke mata uang Rupiah (`IDR`).

## Tasks

<task type="auto">
  <name>Penyesuaian Query dan Data Mapping pada SpkBoronganPanel.tsx</name>
  <files>src/components/SpkBoronganPanel.tsx</files>
  <action>
  - Perbarui interface `RabMaterial`:
    - Tambahkan properti opsional `item_total?: number;`.
    - Tambahkan properti opsional `unit_price?: number;` pada objek `materials`.
  - Sesuaikan pemanggilan query Supabase pada `fetchRabMaterials()`:
    - Sertakan `item_total` pada select `rab_items`.
    - Sertakan `unit_price` pada join relasi `materials`.
  - Definisikan kalkulasi nilai subtotal baris:
    `const subtotal = (typeof item.item_total === 'number' && item.item_total > 0) ? item.item_total : ((item.quantity || 0) * (item.materials?.unit_price || 0));`
  </action>
  <verify>Query mengambil data harga dan kalkulasi subtotal menghasilkan nilai numerik yang valid (atau 0 jika harga kosong/null).</verify>
  <done>Data harga material/jasa RAB tersedia lengkap di state komponen.</done>
</task>

<task type="auto">
  <name>Penambahan Kolom Subtotal RAB pada Tabel Panduan Material</name>
  <files>src/components/SpkBoronganPanel.tsx</files>
  <action>
  - Tambahkan header kolom ketiga pada tabel material setelah Qty:
    - Label header: `Subtotal RAB` (atau `Subtotal`) dengan alignment kanan (`text-right w-32` atau proporsional).
  - Tambahkan sel nilai `subtotal` pada setiap baris `<tr>`:
    - Format nilai dalam Rupiah Indonesia:
      `new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(subtotal)`
    - Handle fallback: Jika subtotal 0, null, atau undefined, tampilkan `Rp 0`.
    - Alignment: Rata kanan (`text-right`), font tabular/medium agar rapi.
  - Penataan tata letak responsif dan rapi:
    - Berikan proteksi `min-w-0` / pembatasan lebar pada kolom nama material agar teks panjang tidak mendesak atau merusak lebar kolom `Qty` dan `Subtotal RAB`.
    - Pastikan styling selaras dengan palet tema gelap kartu (`text-text`, border subtle).
  </action>
  <verify>Tabel di panel Panduan Material memiliki 3 kolom (Nama Material, Qty, Subtotal RAB), data harga terformat Rupiah, dan tata letak tabel tetap rapi.</verify>
  <done>Kolom Subtotal RAB tampil sempurna pada antarmuka pengguna.</done>
</task>

<task type="auto">
  <name>Verifikasi, Type Checking, dan Build Validation</name>
  <files>None</files>
  <action>
  - Jalankan `npm run build` dan `npx oxlint` untuk memastikan build bundler bersih dan tidak ada kesalahan tipe TypeScript maupun linter.
  - Verifikasi fungsionalitas pada modal SPK Borongan untuk WBS 1 (Pembongkaran) pada SPK aktif:
    - Pastikan baris seperti "TUKANG LAS DUDUKAN SLEBOR" dengan Qty 0.2 item menampilkan kolom Subtotal RAB yang akurat.
  - Buat commit atomik: `feat(spk-b): add rab subtotal column in wbs materials guide panel`.
  </action>
  <verify>Build dan linting lulus 100% tanpa error.</verify>
  <done>Perubahan siap digunakan dan terdokumentasi.</done>
</task>
