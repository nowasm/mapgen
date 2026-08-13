# RPG-Cobo Dungeon Visual Pack Implementation Plan

Status: implemented and verified on 2026-08-13.

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace placeholder dungeon visuals with a traceable offline pack derived from selected RPG-Cobo VOX wall, floor, and door models.

**Architecture:** A dependency-free TypeScript converter parses MagicaVoxel v200 scene graphs and selected RPG-Cobo palette mappings into a static JSON pack. The Three.js renderer builds patterned modular surfaces and a source-shaped door mesh while retaining the existing simplified collision contract.

**Tech Stack:** TypeScript, Node.js, Vitest, Three.js, GLTFExporter, Godot 4.6.2.

---

### Task 1: Parse named MagicaVoxel models

**Files:**
- Create: `tools/vox/parse-vox.ts`
- Create: `tools/vox/parse-vox.test.ts`

1. Add tests for chunk bounds, SIZE/XYZI/RGBA, and nTRN/nSHP model names.
2. Implement a dependency-free v200 parser with explicit byte limits.
3. Run focused tests and typecheck.

### Task 2: Build the traceable dungeon visual pack

**Files:**
- Create: `tools/build-rpgcobo-visual-pack.ts`
- Create: `assets/rpgcobo/dungeon-visual-pack.json`
- Create: `assets/rpgcobo/SOURCE_MANIFEST.md`
- Create: `assets/rpgcobo/LICENSE`
- Create: `assets/rpgcobo/NOTICE.txt`
- Modify: `package.json`

1. Select `wall1/brick1`, `pave1/stone4`, and `indoor1/door1` by name.
2. Apply their exact `map_vox.json` palette overrides.
3. Record relative paths, hashes, model dimensions, and converter version.
4. Generate twice and assert byte-identical output.

### Task 3: Render source-derived modular visuals

**Files:**
- Create: `packages/dungeon-renderer/src/rpgcobo-visual-pack.ts`
- Create: `packages/dungeon-renderer/src/voxel-geometry.ts`
- Modify: `packages/dungeon-renderer/src/build-dungeon-scene.ts`
- Modify: `packages/dungeon-renderer/src/build-dungeon-scene.test.ts`

1. Add failing tests for source asset metadata and non-box patterned geometry.
2. Build greedy visible voxel faces with vertex colors.
3. Tile wall/floor patterns and scale the source door model into each door module.
4. Preserve semantic groups, transforms, and collision independence.

### Task 4: Export and Godot regression

**Files:**
- Modify: `tools/generate-dungeon-fixture.ts`
- Replace: `godot/test-project/fixtures/*`
- Modify: `godot/test-project/tests/import_smoke_test.gd`
- Modify: `README.md`
- Create: `docs/verification/rpgcobo-visual-pack.md`

1. Regenerate the paired GLB/JSON fixture.
2. Assert GLB contains source-pack metadata and substantially non-box geometry.
3. Run all tests, typecheck, build, source-pack determinism, and Godot import/bake/reload.
4. Document attribution and measured output.
