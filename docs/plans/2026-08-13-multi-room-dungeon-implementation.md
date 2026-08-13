# Multi-Room Graph-First Dungeon Implementation Plan

Status: implemented and verified on 2026-08-13.

**Goal:** Replace the two-room minimum generator with deterministic multi-room Hub, Ring, Branch, and weighted Random dungeons controlled by the confirmed RPG-Cobo-compatible parameters.

**Architecture:** Generate a connected semantic graph whose nodes also occupy unique integer lattice coordinates. Fit that lattice into the requested XZ grid, resolve seeded parameter ranges, size one room per lattice cell, and connect adjacent cells with collision-safe straight corridors. A separate geometry pass subtracts doorway intervals from room walls and emits ordinary floor, wall, door-frame, door, and collider boxes.

**Tech Stack:** TypeScript, Vitest, React, Three.js, Godot 4.6.2 smoke tests.

---

### Task 1: Expand the versioned layout parameter contract

**Files:**
- Modify: `packages/layout-schema/src/index.ts`
- Modify: `packages/layout-schema/src/layout.schema.json`
- Modify: `packages/layout-schema/src/index.test.ts`

**Steps:**
1. Add failing tests for full range-based parameters, topology mode, resolved values, and topology diagnostics.
2. Run the schema package tests and confirm failure.
3. Introduce `NumericRange`, `LayoutMode`, `DungeonParameters`, `ResolvedDungeonParameters`, and expanded diagnostics types.
4. Keep the JSON major version at 1 because fields are additive and the only producer/consumer are updated together.
5. Update runtime validation with range ordering, bounds, finite-number, and diagnostics checks.
6. Run schema tests and typecheck; commit.

### Task 2: Implement deterministic topology graphs

**Files:**
- Create: `packages/generator-core/src/default-parameters.ts`
- Create: `packages/generator-core/src/resolve-parameters.ts`
- Create: `packages/generator-core/src/generate-topology.ts`
- Create: `packages/generator-core/src/generate-topology.test.ts`
- Modify: `packages/generator-core/src/random.ts`
- Modify: `packages/generator-core/src/index.ts`

**Steps:**
1. Write failing tests for deterministic resolution, weighted Random selection, connected graphs, unique lattice cells, Hub degree, Ring cycles, and Branch dead ends.
2. Add integer/range/choice helpers to the versioned PRNG.
3. Resolve every original double-slider range once per candidate.
4. Build Hub as radial wings, Ring as a rectangular perimeter with attached branches, and Branch as bounded lattice growth.
5. Add loop edges only between orthogonally adjacent occupied cells; mark protected main edges.
6. Run topology tests and typecheck; commit.

### Task 3: Place rooms and corridors in the map grid

**Files:**
- Create: `packages/generator-core/src/place-layout.ts`
- Create: `packages/generator-core/src/place-layout.test.ts`
- Create: `packages/generator-core/src/generate-dungeon.ts`
- Modify: `packages/generator-core/src/index.ts`

**Steps:**
1. Write failing property-style tests over fixed seeds and all modes for bounds, no room overlap, legal corridor direction, graph references, and spawn containment.
2. Fit lattice extents into the requested map with a deterministic pitch and margin.
3. Assign seeded room sizes constrained by the selected cell pitch and min/max parameters.
4. Create straight rectangular corridors for every graph edge and two door records at room boundaries.
5. Emit a valid `DungeonLayout` with resolved topology diagnostics but no visible modules yet.
6. Run tests for at least 100 fixed seeds and workspace typecheck; commit.

### Task 4: Emit doorway-aware modular geometry and collision

**Files:**
- Create: `packages/generator-core/src/build-modules.ts`
- Create: `packages/generator-core/src/build-modules.test.ts`
- Modify: `packages/generator-core/src/generate-dungeon.ts`
- Modify: `packages/dungeon-renderer/src/build-dungeon-scene.test.ts`

**Steps:**
1. Write failing tests that room walls contain legal door gaps, corridor walls do not cap endpoints, closed doors collide, and open doors do not.
2. Merge overlapping doorway intervals per room side and subtract them from wall spans.
3. Emit room/corridor floors, segmented walls, door frames, fixed door models, and simplified collision boxes.
4. Validate connectivity using floor occupancy and door states.
5. Run generator and renderer regression tests; commit.

### Task 5: Replace the minimum web controls and candidate flow

**Files:**
- Modify: `apps/web/src/App.tsx`
- Create: `apps/web/src/ParameterPanel.tsx`
- Modify: `apps/web/src/CandidateMap.tsx`
- Modify: `apps/web/src/App.test.tsx`
- Modify: `apps/web/src/styles.css`

**Steps:**
1. Write failing UI tests for mode selection, range controls, original-default reset, 10 distinct candidates, and stale export state.
2. Replace the minimum generator with `generateDungeon` and expose all confirmed parameters in grouped controls.
3. Show selected effective values and topology statistics without overwhelming the primary panel.
4. Preserve the industrial cartography aesthetic and horizontal candidate comparison.
5. Run browser tests, production build, and real WebGL visual inspection; commit.

### Task 6: Refresh fixtures and Godot regression

**Files:**
- Modify: `tools/generate-minimum-fixture.ts` and rename to `tools/generate-dungeon-fixture.ts`
- Replace: `godot/test-project/fixtures/*`
- Modify: `godot/test-project/tests/import_smoke_test.gd`
- Modify: `docs/verification/minimum-end-to-end.md`
- Modify: `README.md`

**Steps:**
1. Generate a deterministic multi-room default fixture.
2. Run Godot 4.6.2 import/bake/reload validation and assert dynamic collider counts.
3. Run all TypeScript tests, typecheck, build, fixture regeneration, Godot smoke, and editor-plugin initialization.
4. Update documentation from minimum-slice limitations to multi-room stage status.
5. Confirm a clean working tree and commit.
