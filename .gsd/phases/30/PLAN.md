---
phase: 30
plan: add-mandor-wbs-progress-and-gallery
wave: 1
gap_closure: true
---

# Fix: Modul Progres & Galeri Dokumentasi Lapangan pada Halaman /mandor

## Problem
Mandor belum bisa mencatat progres persentase fisik tiap tahapan WBS (1 s/d 5) serta mengunggah galeri foto bukti pengerjaan per kategori WBS.

## Root Cause
Fitur ini belum diimplementasikan di halaman Mandor dan dukungan skema database belum ada.

## Tasks

<task type="auto">
  <name>Database Migrations</name>
  <files>supabase/migrations</files>
  <action>Create a migration file to add `progress_percentage numeric DEFAULT 0` column to `wbs_checklists` table with a constraint `CHECK (progress_percentage >= 0 AND progress_percentage <= 100)`. Create a migration file to add `wbs_category` column to `spk_assets` table (use appropriate data type based on existing). Give the SQL query directly to the user so they can execute it in the Supabase SQL editor.</action>
  <verify>Migration runs successfully and columns are added.</verify>
  <done>User confirmed migration is executed in Supabase SQL Editor.</done>
</task>

<task type="auto">
  <name>Update Types</name>
  <files>src/types/supabase.ts</files>
  <action>Update the TypeScript definitions for `wbs_checklists` to include `progress_percentage: number | null` and for `spk_assets` to include `wbs_category: string | null`.</action>
  <verify>`npm run build` succeeds.</verify>
  <done>Types are correctly updated.</done>
</task>

<task type="auto">
  <name>Implement Modul Progres & Galeri Dokumentasi Lapangan</name>
  <files>src/pages/MandorDashboard.tsx, src/components/mandor/* (if applicable)</files>
  <action>
  1. Add an interactive progress bar (or slider/stepper 0%, 25%, 50%, 75%, 100%) for each of the 5 WBS categories.
  2. Automatically calculate the total SPK project progress based on average or weighted progress of each WBS.
  3. Lock 100% status only if the mandor has uploaded at least 1 proof photo in that WBS.
  4. Create a photo gallery card/tab inside each WBS accordion/section.
  5. Provide a "Ambil Foto / Upload Bukti" button integrated with upload handler (Supabase Storage/Cloudinary).
  6. Display a thumbnail grid of photos with a modal preview (lightbox), timestamp, and the uploader's name (Mandor).
  </action>
  <verify>`npm run build` and `npx oxlint` complete without errors. The UI renders the WBS progress elements correctly.</verify>
  <done>Mandor can set progress percentage and upload/view photos per WBS category.</done>
</task>
