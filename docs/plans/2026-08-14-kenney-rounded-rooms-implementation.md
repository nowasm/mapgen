# Kenney Rounded Rooms Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Add parameter-controlled native Kenney rounded rooms, surface variations, corridor shells, and weighted door styles without breaking deterministic generation or Godot baking.

**Architecture:** Extend the version-1 layout contract with optional visual metadata and new full-generator parameters. A global switch selects either all rectangular rooms or all native 12×12, 20×20, or 20×12 rounded presets. Rendering keeps native room/corridor floors and builds visible Kenney wall segments from the same deterministic perimeter data used by collision.

**Tech Stack:** TypeScript 5.9, Three.js 0.185, React 19, Vitest, Vite, Godot 4.6.

---

### Task 1: Extend generation contracts and controls

**Files:**
- Modify: `packages/layout-schema/src/index.ts`
- Modify: `packages/layout-schema/src/layout.schema.json`
- Modify: `packages/layout-schema/src/index.test.ts`
- Modify: `packages/generator-core/src/default-parameters.ts`
- Modify: `packages/generator-core/src/resolve-parameters.ts`
- Modify: `apps/web/src/ParameterPanel.tsx`
- Modify: `apps/web/src/App.test.tsx`

Add the `roundedRooms` boolean, `roomVariationRate`, `floorVariationRate`, `wallVariationRate`, and `doorStyleWeights`. Add optional room preset/variation metadata, door style, and module asset metadata. Verify invalid values and weights fail, defaults render in the UI, and resolved values remain deterministic.

### Task 2: Select native room presets during placement

**Files:**
- Modify: `packages/generator-core/src/place-layout.ts`
- Modify: `packages/generator-core/src/place-layout.test.ts`

Write failing tests forcing a 100% rounded-room rate. Select only eligible native presets, preserve non-overlap and map bounds, and attach every door to its room. Verify all forced rounded rooms use exact native dimensions and the same Seed remains deterministic.

### Task 3: Build rounded collisions, shell modules, and styled doors

**Files:**
- Modify: `packages/generator-core/src/build-modules.ts`
- Modify: `packages/generator-core/src/build-modules.test.ts`

For rounded rooms emit one native floor visual plus matching visible/collision superellipse wall segments with doorway gaps. For rectangular rooms choose floor/wall variants. Emit a native corridor floor plus two visible/collision side walls. Choose door asset keys from the resolved door style. Verify positive collider sizes, doorway clearance, corridor direction, and inward-opening hinges.

### Task 4: Pack the additional Kenney prototypes

**Files:**
- Modify: `tools/build-kenney-dungeon-pack.ts`
- Modify: `packages/dungeon-renderer/src/kenney-visual-pack.ts`
- Modify: `assets/kenney_modular-dungeon-kit_1.0/SOURCE_MANIFEST.md`
- Regenerate: `assets/kenney_modular-dungeon-kit_1.0/dungeon-visual-pack.json`

Pack room small/large/wide and their variations, corridor/corridor-wide, alternate floor/wall, window door, and metal bars. Preserve UV-baked colors, SHA-256 provenance, and exact source names.

### Task 5: Render complete shells with semantic door cuts

**Files:**
- Modify: `packages/dungeon-renderer/src/modular-geometry.ts`
- Modify: `packages/dungeon-renderer/src/modular-geometry.test.ts`
- Modify: `packages/dungeon-renderer/src/build-dungeon-scene.ts`
- Modify: `packages/dungeon-renderer/src/build-dungeon-scene.test.ts`

Add native floor extraction for room and corridor prototypes, route asset keys to packed prototypes, and expose a `Shells` scene group. Render room/corridor walls from semantic wall modules so only declared door gaps remain. Verify exact bounds, color attributes, source traceability, side-wall direction, and visible door gaps.

### Task 6: End-to-end verification

**Files:**
- Regenerate: `godot/test-project/fixtures/dungeon-dungeon-00019919-hub.*`
- Modify: `docs/verification/kenney-visual-pack.md`
- Modify: `README.md`

Run `pnpm assets:build`, targeted tests, the complete test suite, typecheck, production build, fixture generation, browser visual inspection, and Godot headless bake/reload. Record the new deterministic room/shell/collider counts and remaining single-floor limitations.
