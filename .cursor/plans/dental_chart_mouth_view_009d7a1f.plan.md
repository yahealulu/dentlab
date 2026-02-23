---
name: Dental Chart Mouth View
overview: Upgrade the treatment section so teeth appear in a mouth-shaped layout (2D anatomical chart) and add an optional 3D mouth view. The current chart is a flat grid of rectangles; the goal is an arch-shaped chart with tooth-like shapes and, in a second phase, a 3D rotatable mouth.
todos: []
isProject: false
---

# Dental Chart: Mouth-Shaped 2D + Optional 3D View

## Current state

- **Location**: Patient profile → tab "مخطط الأسنان" (`[src/pages/PatientProfile.tsx](src/pages/PatientProfile.tsx)`).
- **Data**: `[PatientTreatment](src/types/index.ts)` has `toothNumber` (FDI: 11–18, 21–28, 31–38, 41–48) and `jaw` (upper/lower/both).
- **Current chart**: Two horizontal rows of 16 identical `rounded-lg` boxes each (upperTeeth / lowerTeeth). No arch shape, no tooth shape, no 3D.
- **Stack**: React 18, Vite, TypeScript, Tailwind, shadcn/ui. No Three.js/React Three Fiber yet.

---

## Phase 1: 2D anatomical dental chart (mouth-shaped)

Replace the flat grid with an **arch-shaped** chart where teeth sit along upper and lower arches and each tooth has a **tooth-like shape**.

### 1.1 Reusable 2D chart component

- **New file**: `src/components/DentalChart/DentalChart2D.tsx` (or under `src/components/shared/` if you prefer).
- **Responsibilities**:
  - Render **upper arch**: semi-elliptical or parabolic curve (SVG path or CSS) with 16 teeth along the curve (FDI 18→11, 21→28).
  - Render **lower arch**: same idea for 31–38, 41–48.
  - **Tooth shape**: each tooth as a small SVG “crown” (e.g. rounded trapezoid or simplified crown outline) instead of a rectangle, scaled by position (molars slightly wider, incisors narrower if desired).
  - **Positioning**: teeth laid along the arch (e.g. arc length or angle parameterization) so the layout looks like a frontal view of the mouth (occlusal/front view).
- **Props**: `treatments: PatientTreatment[]`, `statusFilter: 'planned' | 'in_progress' | 'completed'`, `onToothClick?(toothNumber: number)`, `getToothColor(toothNumber)`, optional `highlightTooth`.
- **RTL**: layout and labels work in RTL (Arabic); keep FDI numbers as numbers.

### 1.2 Tooth layout and geometry

- **FDI order** (already in code):
  - Upper: `[18,17,…,11, 21,22,…,28]`
  - Lower: `[48,47,…,41, 31,32,…,38]`
- **Arch math**: 
  - Define one SVG path (or curve) per arch (e.g. parabola or half-ellipse).
  - Place 16 points along each path (even spacing or by segment length).
  - At each point, place a tooth shape with normal pointing “out” from the arch (up for upper, down for lower).
- **Tooth SVG**: one small inline SVG “crown” (e.g. path or rounded rect) per tooth; color/fill from `getToothColor(toothNumber)` (planned / in_progress / completed / none). Show FDI number inside or on hover; optional badge for treatment count.

### 1.3 Integration in PatientProfile

- In `[PatientProfile.tsx](src/pages/PatientProfile.tsx)` (around lines 342–358), **replace** the current “Dental Chart Visual” block (the two `flex` rows of boxes) with:
  - `<DentalChart2D treatments={treatments} statusFilter={chartTab} getToothColor={getToothColor} onToothClick={...} />`
- Keep existing logic: `upperTeeth`/`lowerTeeth`, `getToothTreatments`, `getToothColor`, `chartTab`.
- Optional: when a tooth is clicked, scroll to or highlight the corresponding row in the treatment table, or open a small popover listing treatments for that tooth.

### 1.4 Jaw-only treatments

- Treatments with `jaw` (upper/lower/both) and no `toothNumber` currently have no position on the chart. Options:
  - **A)** Small legend or separate “الفك” section (e.g. icons for upper/lower/both) that shows count and opens a list; or
  - **B)** Optional “summary” badges on the arch (e.g. “علوي: 2”) near the arch label.  
  Recommend **A** to avoid cluttering the tooth chart.

### 1.5 Shared / read-only view

- In `[SharePatientView.tsx](src/pages/SharePatientView.tsx)`, you can add the same `DentalChart2D` above or beside the treatments table (read-only, no `onToothClick` or with view-only tooltip) so the shared view also shows the mouth-shaped chart.

---

## Phase 2: 3D mouth view (optional)

Add a **3D** view of the mouth (two arches + teeth) that can be rotated and zoomed.

### 2.1 Dependencies

- Add: `three`, `@react-three/fiber`, and optionally `@react-three/drei` (controls, helpers).
- Bundle impact: ~150–250 KB gzipped; consider lazy-loading the 3D tab.

### 2.2 3D scene design

- **Option A – Simple geometry**: Two arch meshes (e.g. extruded curves or torus segments) + 32 simple teeth (rounded boxes or cylinders) colored by treatment status. No real anatomy, fast to implement.
- **Option B – External model**: Use a low-poly 3D teeth/mouth model (GLTF) if available; more realistic, more effort and asset management.
- **Recommendation**: Start with **Option A** (procedural arches + 32 boxes/capsules) so each tooth has a known index mapping to FDI.

### 2.3 Component and routing

- **New component**: `src/components/DentalChart/DentalChart3D.tsx`.
  - Uses `@react-three/fiber` canvas; scene contains upper arch, lower arch, 32 tooth meshes.
  - **FDI mapping**: array index or name per mesh → FDI number → same `getToothColor(toothNumber)` as 2D.
  - Interactivity: orbit controls (rotate, zoom); click on a tooth → callback `onToothClick(fdi)` and/or tooltip.
- **Lazy load**: `const DentalChart3D = lazy(() => import('@/components/DentalChart/DentalChart3D'))` and render inside a tab or toggle “عرض 2D / عرض 3D” in the dental chart section of PatientProfile.

### 2.4 Performance and UX

- Render 3D only when the 3D tab/view is active (unmount canvas when switched back to 2D).
- Use a single canvas with a reasonable pixel ratio; avoid heavy shadows or post-processing initially.
- Optional: low-poly tooth count (e.g. 16 per arch) if needed for weak devices.

---

## File and structure summary


| Item                                                 | Action                                                                                    |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/components/DentalChart/DentalChart2D.tsx`       | **Create** – SVG arch + tooth-shaped elements, FDI layout, status colors                  |
| `src/components/DentalChart/toothShape.ts` or inline | **Create** – arch curve math + tooth SVG path/shape helpers                               |
| `src/components/DentalChart/constants.ts`            | **Create** (optional) – FDI arrays, arch dimensions, status color map                     |
| `src/pages/PatientProfile.tsx`                       | **Edit** – replace current chart div with `<DentalChart2D ... />`, keep filters and table |
| `src/pages/SharePatientView.tsx`                     | **Edit** (optional) – add read-only DentalChart2D                                         |
| `src/components/DentalChart/DentalChart3D.tsx`       | **Create** (Phase 2) – R3F scene, arches + 32 teeth, FDI mapping, controls                |
| `package.json`                                       | **Edit** (Phase 2) – add `three`, `@react-three/fiber`, `@react-three/drei`               |


---

## Data flow (unchanged)

- **PatientProfile** already has: `treatments`, `chartTab`, `getToothTreatments(toothNum)`, `getToothColor(toothNum)`.
- **DentalChart2D** receives `treatments` and `statusFilter={chartTab}`; it can derive `getToothTreatments` internally or receive `getToothColor` from the parent so status colors stay consistent with the table.
- **DentalChart3D** uses the same treatment list and FDI mapping; only the rendering is 3D.

---

## Visual target (Phase 1)

- **2D**: Like a standard dental chart: upper arch (curved like a smile) on top, lower arch (curved like a frown) below, with small tooth-shaped elements along each arch. Each tooth shows FDI number and color by treatment status (planned / in progress / completed). No 3D yet.
- **3D** (Phase 2): Same 32 teeth in 3D space, two arches; user can rotate and zoom to “look” at the mouth from different angles; click tooth to see treatments.

---

## Implementation order

1. **Phase 1**: Implement `DentalChart2D` (arch curves + tooth shapes + FDI layout), integrate into PatientProfile, then optionally into SharePatientView. No new dependencies.
2. **Phase 2** (optional): Add Three.js stack, implement `DentalChart3D`, add 2D/3D toggle and lazy loading in the dental chart tab.

This plan gives you a **strong, production-style** path: first a correct, mouth-shaped 2D chart with tooth-like shapes and clear treatment mapping; then an optional 3D mouth view without changing existing data structures or treatment logic.