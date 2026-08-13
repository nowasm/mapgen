# Minimum End-to-End Dungeon Slice Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a local web tool that generates a deterministic two-room dungeon, previews it in 3D, exports paired GLB/JSON files, and provides a Godot 4 editor plugin that bakes them into an editable collision scene.

**Architecture:** A pnpm TypeScript monorepo separates the versioned layout contract, pure deterministic generator, Three.js renderer/exporter, and React UI. A Godot 4 editor plugin consumes the same JSON contract and an adjacent GLB, validates the pair, creates native collision/spawn nodes, and saves a `.tscn`.

**Tech Stack:** Node.js 22, pnpm, TypeScript, Vitest, React, Vite, Three.js, Godot 4 GDScript.

---

### Task 1: Scaffold the workspace

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.gitattributes`
- Create: package manifests and TypeScript configs under `packages/` and `apps/web/`

**Steps:**
1. Add workspace scripts for build, test, typecheck, and lint-like checks.
2. Declare exact package boundaries and development dependencies.
3. Install dependencies and commit the lockfile.
4. Run `pnpm typecheck` to confirm the empty workspace is wired correctly.

### Task 2: Implement the versioned layout contract

**Files:**
- Create: `packages/layout-schema/src/index.ts`
- Create: `packages/layout-schema/src/layout.schema.json`
- Create: `packages/layout-schema/src/index.test.ts`

**Steps:**
1. Write failing tests for accepted minimal layouts and rejected invalid versions/vectors/sizes.
2. Run `pnpm --filter @mapgen/layout-schema test` and verify failure.
3. Implement TypeScript types, schema constant, runtime guard, and assertion helper.
4. Re-run package tests and typecheck.
5. Commit the contract.

### Task 3: Generate a deterministic minimum dungeon

**Files:**
- Create: `packages/generator-core/src/random.ts`
- Create: `packages/generator-core/src/generate-minimum-dungeon.ts`
- Create: `packages/generator-core/src/index.ts`
- Create: `packages/generator-core/src/generate-minimum-dungeon.test.ts`

**Steps:**
1. Write tests for determinism, two connected rooms, spawn placement, legal colliders, and door state reproducibility.
2. Verify tests fail before implementation.
3. Implement a versioned PRNG and generate two rooms joined by a corridor.
4. Derive floor, perimeter wall, and fixed door colliders in centered world coordinates.
5. Run generator tests and workspace typecheck.
6. Commit the generator.

### Task 4: Build and export the Three.js dungeon scene

**Files:**
- Create: `packages/dungeon-renderer/src/build-dungeon-scene.ts`
- Create: `packages/dungeon-renderer/src/export-dungeon.ts`
- Create: `packages/dungeon-renderer/src/index.ts`
- Create: `packages/dungeon-renderer/src/build-dungeon-scene.test.ts`

**Steps:**
1. Write tests for floor/wall/door node groups, centered bounds, and export metadata.
2. Verify tests fail before implementation.
3. Build ordinary Three.js meshes from layout colliders with a restrained placeholder material kit.
4. Export binary GLB with `GLTFExporter`, embed `exportId`, hash the GLB, and serialize paired JSON.
5. Run renderer tests, workspace tests, and typecheck.
6. Commit the renderer/exporter.

### Task 5: Create the local web generator

**Files:**
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/DungeonViewport.tsx`
- Create: `apps/web/src/CandidateMap.tsx`
- Create: `apps/web/src/styles.css`
- Create: `apps/web/src/App.test.tsx`

**Steps:**
1. Write a failing interaction test for generating candidates and selecting a candidate.
2. Implement the industrial cartography UI with Seed, map size, corridor width, and door-open controls.
3. Generate 10 lightweight candidates and build 3D only for the selected candidate.
4. Add orbit controls, layout diagnostics, collision visibility, and paired export downloads.
5. Run tests, typecheck, and production build.
6. Start the app, inspect it in a browser, and fix visual/runtime issues.
7. Commit the web app.

### Task 6: Implement the Godot 4 baker plugin

**Files:**
- Create: `godot/addons/mapgen_importer/plugin.cfg`
- Create: `godot/addons/mapgen_importer/mapgen_importer.gd`
- Create: `godot/test-project/project.godot`
- Create: `godot/test-project/tests/import_smoke_test.gd`
- Create: `godot/README.md`

**Steps:**
1. Implement a dock that selects `*.layout.json`, validates the schema/export pair, and locates adjacent `*.glb`.
2. Instantiate the GLB and build `StaticBody3D`, `BoxShape3D`, `CollisionShape3D`, `Marker3D`, and metadata nodes.
3. Save a sibling `.tscn` without silently overwriting user-authored content.
4. Add a headless smoke-test script and static contract tests.
5. If Godot is locally available, run the headless smoke test; otherwise record the exact pending command.
6. Commit the plugin.

### Task 7: Verify and document the slice

**Files:**
- Modify: `README.md`
- Create: `docs/verification/minimum-end-to-end.md`

**Steps:**
1. Run `pnpm test`, `pnpm typecheck`, and `pnpm build`.
2. Generate an actual GLB/JSON pair through the app or export harness and inspect its headers/schema.
3. Run Godot verification when an executable is available; otherwise keep the limitation explicit.
4. Document local development, export, Godot install/use, known limitations, and next-stage work.
5. Confirm `git diff --check` and a clean production build.
6. Commit the verified first-stage slice.
