# Project Brief & PRD: KaroseriOps Management System
**Document Version:** 1.0.0-PROD  
**Target Domain:** Heavy Commercial Vehicle Bodybuilding, Chassis Modification & Custom Fabrication ERP  
**Product Classification:** Tier-1 Industrial Shopfloor Operating System & Financial Governance Platform  

---

## 1. Executive Summary & Vision

**KaroseriOps** is a mission-critical Enterprise Resource Planning (ERP) and Shopfloor Execution System engineered specifically for heavy commercial vehicle bodybuilders (*karoseri*), chassis alteration workshops, and specialty fleet fabricators (dump bodies, refrigerated haulers, tank trucks, intercity buses, and heavy mining rigs).

Unlike standard light-vehicle DMS or generic accounting ERPs, KaroseriOps directly ties physical fabrication milestones (Work Breakdown Structure / WBS) to strict financial gatekeeping and Segregation of Duties (SoD). Invoicing, material staging drawdowns, and gate-out release passes are mechanically locked at the software level until physical quality control (dimensional compliance, weld integrity, ultrasonic gauge tests, pressure hold, and water-ingress shower tests) are digitally signed by certified shopfloor foremen (*Mandor*) and quality inspectors.

---

## 2. Core Operational Pillars & Problem Statement

### 2.1 The Industry Bottlenecks Solved
1. **Premature Final Billing & Cash Leakage**: Cashiers historically invoice or issue Surat Jalan (Delivery Notes) before paint cure, hydraulic seal verification, or brake tests are completed, leading to costly customer disputes and unbudgeted warranty rework.
2. **Shopfloor Disconnection & Greasy Tablet Ergonomics**: Standard complex ERP desktop interfaces fail on the dusty, noisy, high-glare shopfloor where foremen and welders wear heavy PPE and work with grease-covered hands.
3. **Uncontrolled High-Value Material Requisitions**: Fabricators often draw high-tensile steel plates (Hardox 450, Domex), PTO pumps, and multi-stage hydraulic cylinders without real-time linkage to the Work Order (Surat Perintah Kerja / SPK) budget.
4. **Lack of Cryptographic & Immutable Audit Trails**: Traceability failure when structural weld joints fail or axle modification records are audited under ISO 9001:2015 and national commercial vehicle safety standards.

---

## 3. User Personas & Role-Based Access Control (RBAC)

| Role Code | Operational Title | Primary Workstation / Terminal | Core Responsibilities & Permission Boundaries |
| :--- | :--- | :--- | :--- |
| **ROLE-OWNER** | Owner / General Admin / Plant Director | Executive Pricing HUD (Desktop) | Full system clearance, margin telemetry, P&L audit, dual-key cryptographic emergency override authority. |
| **ROLE-SA** | Service Advisor / Estimator | Inbound Chassis Intake Desk (Desktop) | Client intake, chassis VIN verification, SPK creation, initial dimensional baseline recording. |
| **ROLE-FOREMAN** | Shopfloor Foreman (*Mandor Utama*) | Rugged Bay Tablet (Mobile/Tablet Numpad) | WBS stage progression sign-off, shift worker dispatch, consumable requisitions (< Rp 15M), torque/ultrasonic QA sign-off. |
| **ROLE-WH** | Warehouse Custodian | Material Gate Terminal (Desktop/Tablet) | Steel coil/plate picklist dispatch, unistrut/fastener buffer bins, dual-signoff high-value requisitions (> Rp 15M). |
| **ROLE-FINANCE** | Finance / Cashier | Cashier Queue Terminal (Desktop) | Progressive milestone drawdowns, faktur pajak generation, final invoice release (**Hard-gate blocked pending QC Pass**). |

---

## 4. Key Architectural Modules

### 4.1 Shopfloor Telemetry & Tablet PIN Gateway (`Shopfloor Terminal Access`)
* **Hardware Target**: Ruggedized IP65/IP67 10-inch tablets mounted on magnetic swing arms at fabrication bays.
* **Ergonomics**: High-contrast, dark-mode anti-glare UI (`#0B1326` / `#1E293B`) tuned for welding arc flashes and bright halogen bay lamps.
* **Input Mechanics**: Oversized 3x4 numeric keypad with 6-digit rapid PIN authentication and RFID/NFC contactless work badge sensor fallback.
* **Instant Shift Roster**: Real-time worker assignment cards (e.g., Sasis & Rangka, Cat & Finishing, Elektrikal & Hidrolik).

### 4.2 Work Breakdown Structure (WBS) Hard-Gate Pipeline
Vehicles progress through five sequential physical gates:
1. **WBS 01 — Demolition & Prep**: Chassis degreasing, sandblasting, crossmember squaring check.
2. **WBS 02 — Chassis & Subframe**: Heavy gusset weld integrity, subframe torque specs, wheelbase extension/reduction certified.
3. **WBS 03 — Body & Sheeting**: High-tensile steel (Hardox 450) plate fabrication, ultrasonic plate thickness check.
4. **WBS 04 — Paint & Top Coat**: Anti-corrosive primer, Polyurethane 140µm DFT coating check and bake cure pass.
5. **WBS 05 — Electrical & Hydraulic Testing**: Shower test (water-tight cabin/box), hydraulic cylinder 320-bar hold test, PTO pump linkage.

### 4.3 Automated Hard-Gate QC Invoicing Intercept (`Gate 03: QC Billing Lock`)
* **Trigger Condition**: Any cashier attempt to access the billing module or print Surat Jalan cetak while any WBS stage remains uncertified or in-progress.
* **Enforcement**: Mechanical software lock (`ERR_WBS_GATE_UNRELEASED_094`). Displays exact blocking bay, live test rig telemetry (e.g., hydraulic hold duration), and assigned inspection lead.
* **Resolution Flow**:
  1. *Standard Resolution*: One-click **Request Expedited Inspection** triggers high-priority visual alert on the foreman’s rugged bay tablet.
  2. *Live Verification*: Direct RTSP bay camera CCTV stream (`NGW-BAY04-CAM-01`) for visual confirmation.
  3. *Executive Override*: Dual-key Level-4 cryptographic RSA-SHA256 token entry reserved strictly for General Managers, generating an indelible ISO 9001 compliance incident log.

### 4.4 Global Navigation & Contextual Clearance Status Banner
* **Location & Bay Telemetry**: Persistent indicator of active plant location (e.g., *Ngawi Modification Hub — Bay 04 Heavy Line*).
* **Multi-Index Search**: Instant Omni-search supporting SPK Number, License Plate Number, or Chassis VIN (`⌘K` hotkey).
* **Clearance Warning Sub-Bar**: Dynamic persistent banner highlighting active role restrictions (e.g., *"Material requisitions > Rp 15.000.000 require Warehouse Custodian + Plant Head dual signoff"*).

---

## 5. Technical Stack & Implementation Architecture

* **Frontend Framework**: High-performance semantic HTML5, Tailwind CSS with custom industrial color tokens (`#EA580C` Safety Orange, `#0B1326` Deep Navy Surface).
* **Typography**: Space Grotesk / Monospace pairing for technical readouts, telemetry gauges, and serial numbers.
* **Security & Authentication**:
  * Role-Based Access Control (RBAC) with station-bound IP verification.
  * 6-digit rapid PIN hashing for rugged bay terminals.
  * Encrypted RSA-SHA256 tokens for high-privilege emergency overrides.
* **Compliance Standards**: ISO 9001:2015 Clause 8.6 (Control of non-conforming outputs & release authorization).

---

## 6. Success Metrics & KPIs
1. **Zero Premature Delivery Passes**: 100% elimination of billing or vehicle release prior to QC sign-off.
2. **Shopfloor Cycle Time Visibility**: Real-time tracking of labor burn vs. budgeted hours per fabrication stage.
3. **BOM Variance Reduction**: <1% variance in raw structural steel yield and hydraulic components.
4. **Bay Response Velocity**: <3 minutes average turnaround for expedited foreman inspection notifications.
