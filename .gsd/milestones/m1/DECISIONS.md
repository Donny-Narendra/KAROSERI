# Architectural Decision Records (ADR)

## ADR-001: Pemilihan RDBMS PostgreSQL (Supabase) dengan tipe JSONB dibanding NoSQL
- **Status:** Diterima
- **Konteks:** Sistem butuh integritas finansial kelas enterprise namun form Quality Control (QC) butuh kelenturan yang tinggi (dinamis).
- **Keputusan:** Kami menggunakan PostgreSQL via Supabase dengan skema relasional ketat untuk transaksi (menjamin ACID properti), namun memadukan tipe kolom JSONB untuk elemen spesifik yang dinamis seperti form inspeksi/QC.

## ADR-002: WBS-Centric Event-Driven Accounting
- **Status:** Diterima
- **Konteks:** Kebutuhan pencatatan biaya manufaktur kendaraan bersifat granular (per komponen kegiatan).
- **Keputusan:** Sistem menggunakan WBS (Work Breakdown Structure) sebagai jangkar dasar akuntansi. Costing akan dihitung secara event-driven, dimana aksi perakitan per WBS memicu jurnal pembiayaan tanpa intervensi akuntan secara manual.

## ADR-003: Penegakan 4 Hard-Gates melalui Database Triggers & Supabase RLS
- **Status:** Diterima
- **Konteks:** Pengawasan prosedur bengkel rawan akan override secara paksa dari sisi client/aplikasi yang diretas.
- **Keputusan:** 4 Sistem Hard-Gates (SPK Start, Material Budget, QC Billing, dan Handover) ditegakkan menggunakan Database Triggers dan Supabase Row Level Security (RLS) di layer database. Ini memastikan logika penguncian tidak bisa dilewati walaupun request dilakukan via API langsung.
