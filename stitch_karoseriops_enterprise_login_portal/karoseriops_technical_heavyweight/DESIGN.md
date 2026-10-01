---
name: KaroseriOps Technical Heavyweight
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#e2bfb2'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#a98a7e'
  outline-variant: '#5a4138'
  surface-tint: '#ffb599'
  primary: '#ffb599'
  on-primary: '#5a1c00'
  primary-container: '#f66018'
  on-primary-container: '#4f1700'
  inverse-primary: '#a73a00'
  secondary: '#b4c5ff'
  on-secondary: '#002a78'
  secondary-container: '#0053db'
  on-secondary-container: '#cdd7ff'
  tertiary: '#c4c7c9'
  on-tertiary: '#2d3133'
  tertiary-container: '#8e9193'
  on-tertiary-container: '#272a2c'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdbce'
  primary-fixed-dim: '#ffb599'
  on-primary-fixed: '#370e00'
  on-primary-fixed-variant: '#7f2b00'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#e0e3e5'
  tertiary-fixed-dim: '#c4c7c9'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 3rem
    fontWeight: '700'
    lineHeight: 3.5rem
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 2rem
    fontWeight: '700'
    lineHeight: 2.5rem
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 2rem
    fontWeight: '600'
    lineHeight: 2.5rem
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 1.375rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.5rem
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.25rem
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1rem
    letterSpacing: 0.01em
  label-lg:
    fontFamily: JetBrains Mono
    fontSize: 0.875rem
    fontWeight: '600'
    lineHeight: 1.25rem
    letterSpacing: 0.02em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.03em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 0.6875rem
    fontWeight: '500'
    lineHeight: 0.875rem
    letterSpacing: 0.05em
spacing:
  gutter: 1rem
  gutter-compact: 0.5rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes a high-density, fault-tolerant interface for custom automotive body modifications, chassis manufacturing lines, and heavy-duty coachbuilding ERP environments. It reconciles high-volume telemetry, Bill of Materials (BOM) management, inventory staging, and dynamic workshop work-orders into a cohesive operational workstation.

### Visual Ethos
- **Industrial Precision:** Interfaces behave like calibrated instrumentation panels. Visual hierarchy is established through strict alignment, architectural clarity, and tabular data legibility.
- **Utilitarian Resilience:** Interfaces prioritize zero cognitive drag in high-glare environments (shop floors, inspection bays, loading docks). Non-essential decorative flourishes are excluded in favor of structural clarity.
- **Mechanical Contrast:** Dark tactical structural containers encapsulate data grids and telemetry, anchored by luminous light-surfaced data zones and vivid industrial hazard markers.

### Design Movement
The system balances **Modern Industrial Technical** and **Structured Utilitarian Flat**. It avoids simulated skeuomorphism or excessive glass refraction, relying on 1px precision dividers, high-visibility status indicators, and mechanical data groupings.

## Colors

The palette draws from workshop floor hazards, blueprint schematics, and aerospace/automotive testing software.

### Primary (`#EA580C` - Safety Orange)
Used as an intentional operational signal: execution actions, critical line-stoppages, tool calibration triggers, active stages on the production timeline, and primary CTAs. It must never be diluted with non-critical decorations.

### Secondary (`#2563EB` - Engineering Cobalt)
Represents technical logic: CAD/CAM linkouts, part specification sheets, active structural blueprint overlays, dynamic telemetry tracking, and non-blocking administrative workflows.

### Neutral (`#0F172A` - Deep Industrial Slate)
The baseline canvas and chrome tone. Extended via structured tiers:
- Canvas/App Shell: `#0B1120`
- Surface Level 1 (Sidebars, Topbars, Structural Rails): `#0F172A`
- Surface Level 2 (Cards, Viewports, Table Rows): `#1E293B`
- Surface Level 3 (Hover States, Input Fill, Nested Panels): `#334155`
- Structural Lines / Borders: `#334155` (Subtle), `#475569` (Defined)

### Architectural Light (`#F8FAFC` - Light Gray/Technical White)
Primary text, active indicator markers, and specialized printable view modes (e.g., cut lists, VIN assignment labels). Inverted table views utilize this surface for maximum sunlight visibility.

### Functional Status Indicators
- **Nominal / In-Tolerance:** `#16A34A` (Precision Green)
- **Cautionary / Staging Delay:** `#EAB308` (Hazard Amber)
- **Critical / QA Failure / Block:** `#DC2626` (Stoppage Crimson)
- **Tooling Idle / Unassigned:** `#64748B` (Machined Steel)

## Typography

Typography balances rapid scanning, structural authority, and zero-error character recognition.

### Role Allocation
- **Display & Headlines (`Space Grotesk`):** Delivers an architectural, engineered aesthetic for station designations, bay numbers, production phases, and system module titles.
- **Body & Operational Copy (`Inter`):** Neutral, maximum legibility at variable rendering angles; used for instruction manifests, safety procedures, and administrative logs.
- **Data, Status & Code Identifiers (`JetBrains Mono`):** Applied to serial numbers, VINs, dimensional tolerances (mm/deg), parts-per-box metrics, sensor outputs, and timestamps. Monospaced tabular figures (`tnum`) ensure numbers do not jitter during real-time telemetry refreshes.

## Layout & Spacing

The layout model is based on an **instrumentation dense fluid grid** built for high screen utility on wide 1080p/4K plant monitoring displays, ruggedized tablet terminals, and handheld logistics scanners.

### Grid Construction
- **Desktop (1280px+):** 12-column variable fluid grid. Default gutter is `1rem` (16px); dense technical data layouts contract to `gutter-compact` (`0.5rem` / 8px) to optimize spatial density. Margin is `1.5rem`.
- **Tablet / Rugged Terminal (768px – 1279px):** 8-column layout with fixed collapsable utility rail. Gutter remains `1rem`, outer margin scales to `1.25rem`.
- **Handheld / Shopfloor Scanner (< 768px):** 4-column single-stack stream. Margins set to `1rem` (`margin-mobile`), minimizing edge waste while retaining safe tap margins.

### Spacing Principles
- Density takes precedence over expansive negative space; data-dense modules maintain `0.5rem` internal gaps (`space-sm`) and `0.25rem` item separations (`space-xs`).
- Structural boundaries and macro-groups use `space-md` or `space-lg`.
- Strict 4px/8px mathematical increments maintain rhythm across tabular views, telemetry readouts, and line overview panels.

## Elevation & Depth

This design system avoids soft, diffused drop shadows. Instead, it defines spatial stratification through **mechanical layering and hard low-contrast outlines**.

### Depth Hierarchy
- **Level 0 (Floor/Canvas):** Base viewport `#0B1120`. Non-interactive backdrop.
- **Level 1 (Docked Containers & Toolbars):** `#0F172A` with a 1px solid border of `#334155`.
- **Level 2 (Active Panels, Workcell Cards):** `#1E293B` surrounded by 1px solid `#334155`. Hover or focus elevation transitions the border to `#475569` or the secondary accent (`#2563EB`), not a drop shadow.
- **Level 3 (Floating Overlays, Flyouts, Calibration Popovers):** `#1E293B` accompanied by a distinct 1px technical border of `#64748B` and an ambient zero-blur offset projection: `0px 8px 0px rgba(11, 17, 32, 0.85)`.
- **Active Focus & Critical Alerts:** Signaled via crisp 2px unblurred keyline rings (`#EA580C` for primary alerts; `#2563EB` for input selections) with 2px offset spacing.

## Shapes

The design system adopts **Sharp (`0px`)** geometry. 

Corners throughout the system are clean, 90-degree industrial intersections. This reinforces precision manufacturing tolerances, blueprint schematics, and mechanical sheet-metal fabrication. Buttons, data-table cells, input boxes, status badges, and flyouts use square corners. 

Chamfered or angled corners (45-degree corner clips) are strictly reserved for high-visibility machine state tags and primary stage-gate indicators to evoke industrial panel cutouts.

## Components

### Buttons
- **Primary (Execution):** Background `#EA580C`, foreground `#FFFFFF`, border none, sharp 0px radius. Font: `JetBrains Mono`, 12px uppercase, tracking `0.05em`. Active state: `#C2410C`.
- **Secondary (Technical):** Background `#1E293B`, foreground `#F8FAFC`, border 1px solid `#475569`. Hover: border `#2563EB`, foreground `#60A5FA`.
- **Destructive/Emergency:** Background `#DC2626`, foreground `#FFFFFF`, 0px radius.

### Input Fields
- Background `#0F172A`, border 1px solid `#334155`, text `#F8FAFC`, font `Inter` or `JetBrains Mono` for dimensional values.
- **Focus:** 1px solid `#2563EB` with an external 1px `#2563EB` highlight ring.
- **Unit Adornments:** Right-pinned prefix/suffix blocks (e.g., `mm`, `kg`, `deg`) rendered in `#334155` fill with `#94A3B8` monospace text.

### Chips & Technical Badges
- 0px border-radius, height 20px or 24px, inner padding `0.25rem 0.5rem`.
- Monospace font (`JetBrains Mono` 11px uppercase).
- Structured in low-saturation dark variants with bright text and bright 1px left-edge indicator rule (e.g., Stage 3 Assembly: `#1E293B` background, 2px left border `#EA580C`, text `#F8FAFC`).

### Tables & Data Grids
- Headers: `#0F172A`, text `#94A3B8`, uppercase `label-md`, border-bottom 2px solid `#334155`.
- Rows: Alternating rows `#0F172A` and `#131D31`. Row borders 1px solid `#1E293B`.
- Row hover: `#1E293B` with a left 3px indicator line in `#2563EB`.
- Numeric cells right-aligned using `JetBrains Mono` with `font-variant-numeric: tabular-nums`.

### Checkboxes & Radios
- Sharp 0px square construction.
- Unchecked: 1px solid `#475569` over `#0F172A`.
- Checked: `#EA580C` background with white mechanical crossmark (`✕`) or square pip, eliminating consumer-style rounded checkmarks.

### Cards & Workcell Monitors
- Structural enclosures with 1px solid `#334155` perimeter lines, `#1E293B` container fill.
- Header bars include technical metadata, station IDs, and action buttons separated by 1px bottom divider `#334155`.

### Specialized Domain Components
- **Chassis Modification Schematic Viewer:** Dark `#080C14` viewport with 16px isometric grid lines (`#1E293B`), overlaying high-visibility vector lines (`#2563EB` structural chassis, `#EA580C` modified cut-lines).
- **Tolerance Gauge Bar:** Split-segment horizontal track showing upper and lower millimetric drift limits, switching from `#16A34A` (nominal) to `#EA580C` (out-of-spec).