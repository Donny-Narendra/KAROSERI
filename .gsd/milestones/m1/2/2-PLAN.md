---
phase: 2
plan: 2
wave: 2
---

# Plan 2.2: Service Advisor Check-in UI

## Objective
Build the UI for the Service Advisor to register a new SPK, upload vehicle condition photos (360°), and manage change orders.

## Context
- .gsd/SPEC.md
- src/pages/AdminDashboardPage.tsx

## Tasks

<task type="auto">
  <name>Build SPK Check-in Form & Asset Uploader</name>
  <files>
    src/pages/ServiceAdvisorDashboard.tsx
    src/components/SpkForm.tsx
  </files>
  <action>
    - Create `ServiceAdvisorDashboard.tsx` to list existing SPKs.
    - Create `SpkForm.tsx` for registering a new SPK (customer name, vehicle plate, target date).
    - Implement a file upload component inside `SpkForm` using `@supabase/supabase-js` storage API to upload to `spk-assets` bucket.
    - Insert the new SPK and the asset URLs into Supabase tables `spk` and `spk_assets`.
    - Apply the industrial dark UI theme consistent with the rest of the app.
  </action>
  <verify>npm run build</verify>
  <done>Form correctly compiles and includes file upload logic.</done>
</task>

<task type="auto">
  <name>Update Routing for Service Advisor</name>
  <files>src/App.tsx</files>
  <action>
    - Add a protected route for `/service-advisor` rendering `ServiceAdvisorDashboard`.
    - Ensure it's restricted to `service_advisor` and `owner` roles using `ProtectedRoute`.
  </action>
  <verify>npm run lint</verify>
  <done>Routes are securely defined.</done>
</task>

## Success Criteria
- [ ] Service Advisor can access a dedicated dashboard.
- [ ] SPK check-in form can capture text data and upload photos to Supabase Storage.
