---
phase: 3
plan: 1
wave: 2
depends_on: []
files_modified:
  - src/components/WbsChecklist.tsx
autonomous: true
must_haves:
  truths:
    - WBS Checklist can read existing statuses from Supabase.
    - Status updates are persisted to the database.
  artifacts:
    - src/components/WbsChecklist.tsx
---

# Plan 3.1: WBS Checklist Backend Integration

<objective>
Implementasi fungsi CRUD pada komponen `WbsChecklist` sehingga mandor dapat mengubah status checklist (PASS/FAIL/PENDING) yang tersimpan riil ke database (tabel `wbs_checklists`).

Purpose: Menghidupkan fitur antrean dan pencatatan WBS agar tidak lagi bersifat mock.
Output: Komponen WbsChecklist yang terhubung penuh ke Supabase.
</objective>

<context>
Load for context:
- src/components/WbsChecklist.tsx
- supabase/migrations/20261001000004_phase4_schema.sql (wbs_checklists table)
</context>

<tasks>

<task type="auto">
  <name>Integrate Supabase in WbsChecklist</name>
  <files>src/components/WbsChecklist.tsx</files>
  <action>
    - Import supabase client.
    - Use `useEffect` to fetch existing `wbs_checklists` for the given `spkId`. Map the returned records into the `statuses` and `notes` state.
    - Remove the commented-out code in `handleStatusUpdate` and uncomment/fix the Supabase `upsert` call.
    - Make sure `updated_by` uses `user.id`.
    - Ensure enum values ('PENDING', 'PASS', 'FAIL') map perfectly to the DB.
  </action>
  <verify>grep -q "supabase.from('wbs_checklists')" src/components/WbsChecklist.tsx</verify>
  <done>Checklist UI reflects database state and updates properly mutate the backend.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] Database upserts successfully when clicking PASS or FAIL.
- [ ] On component reload, the previous state is restored from the DB.
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>
