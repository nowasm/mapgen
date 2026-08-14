# Surface Texture Controls Implementation Plan
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users independently choose wall and floor Base Color textures, tune coverage size, preview changes without regenerating layout, and export the selected textures inside GLB with appearance metadata in JSON.

**Door-frame extension:** Door frames default to `follow-wall`, can select any wall texture or Kenney original colour, and use wall-style world UVs. Door leaves are intentionally excluded.

**Architecture:** Keep appearance as a separate editor concern while adding an optional, portable appearance snapshot to `DungeonLayout` for paired exports. The renderer accepts already-loaded Three.js textures, generates world-aligned UVs only for textured floor/wall geometry, and leaves Kenney-coloured doors untouched.

**Tech Stack:** TypeScript, React, Three.js, Vite, Vitest, JSON Schema, Godot 4 import smoke tests.

---

### Task 1: Appearance contract and catalog

**Files:**
- Modify: `packages/layout-schema/src/index.ts`
- Modify: `packages/layout-schema/src/layout.schema.json`
- Modify: `packages/layout-schema/src/index.test.ts`
- Create: `apps/web/src/material-catalog.ts`
- Create: `assets/textures/bricks_and_tiles/SOURCE_MANIFEST.md`

Add the optional export appearance contract, validate it, define stable IDs for the ten Base Color images and original-colour fallback, and document source/license provenance.

### Task 2: World-aligned UV rendering

**Files:**
- Modify: `packages/dungeon-renderer/src/modular-geometry.ts`
- Modify: `packages/dungeon-renderer/src/modular-geometry.test.ts`
- Modify: `packages/dungeon-renderer/src/build-dungeon-scene.ts`
- Modify: `packages/dungeon-renderer/src/build-dungeon-scene.test.ts`
- Modify: `packages/dungeon-renderer/src/index.ts`

Generate stable world-aligned UVs on cloned floor and wall geometry, create per-scene textured materials, and keep door meshes on their original vertex colours.

### Task 3: Preview and export integration

**Files:**
- Create: `apps/web/src/load-appearance-textures.ts`
- Modify: `apps/web/src/DungeonViewport.tsx`
- Modify: `packages/dungeon-renderer/src/export-dungeon.ts`
- Modify: `packages/dungeon-renderer/src/export-dungeon.test.ts`

Load same-origin Vite texture URLs with caching, rebuild the preview when appearance changes, and pass the same appearance/texture set to GLTF export and paired JSON.

### Task 4: Inspector-style controls

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/ParameterPanel.tsx`
- Modify: `apps/web/src/App.test.tsx`
- Modify: `apps/web/src/styles.css`

Add independent wall/floor selectors and coverage-size inputs. Appearance changes update preview immediately and never mark the generated layout stale. Reset restores both layout and appearance defaults.

### Task 5: Verification and documentation

**Files:**
- Modify: `README.md`
- Create: `docs/verification/surface-texture-workflow.md`

Run focused tests, full tests, typecheck, production build, generate the fixed fixture, and run the Godot import smoke test. Record expected UI and export behaviour.
