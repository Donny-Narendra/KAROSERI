---
phase: 2
plan: 1
wave: 1
---

# Plan 2.1: Database Schema & Storage for SPK and Vehicle Assets

## Objective
Establish the Supabase backend infrastructure for the Service Advisor module (Vehicle Check-in, Foto 360°, SPK, and Change Orders).

## Context
- .gsd/SPEC.md
- supabase/migrations/20261001000000_initial_schema.sql

## Tasks

<task type="auto">
  <name>Create SPK Schema Migration</name>
  <files>supabase/migrations/20261001000001_spk_schema.sql</files>
  <action>
    Create a new SQL migration for SPK-related tables:
    - Create enum `spk_status`: 'DRAFT', 'PENDING_PAYMENT', 'ACTIVE', 'COMPLETED', 'CANCELLED'.
    - Create `spk` table: id, spk_no (unique), customer_name, vehicle_plate, status, target_date, total_estimated_cost, dp_amount, created_by (UUID to profiles), created_at.
    - Create `spk_assets` table: id, spk_id (FK), file_url, description, uploaded_by, created_at.
    - Create `spk_amendments` table (Change Order): id, spk_id (FK), description, cost_adjustment, approved_by (owner/admin), status ('PENDING', 'APPROVED', 'REJECTED'), created_at.
    - Set up Row Level Security (RLS) policies for Service Advisor and Owner.
  </action>
  <verify>npx supabase db reset --local</verify>
  <done>Migration runs successfully and tables are created.</done>
</task>

<task type="auto">
  <name>Set up Supabase Storage Bucket</name>
  <files>supabase/migrations/20261001000002_storage_setup.sql</files>
  <action>
    Create a SQL migration to insert a new storage bucket 'spk-assets' for uploading 360° photos and documents.
    - Add RLS policies allowing authenticated users to upload and read from this bucket.
  </action>
  <verify>npx supabase db reset --local</verify>
  <done>Storage bucket is created with correct permissions.</done>
</task>

## Success Criteria
- [ ] Supabase schema accurately reflects SPK requirements.
- [ ] Storage bucket is ready for asset uploads.
