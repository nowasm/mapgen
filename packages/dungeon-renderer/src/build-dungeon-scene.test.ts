import { DEFAULT_DUNGEON_PARAMETERS, generateDungeon, generateMinimumDungeon } from "@mapgen/generator-core";
import { Box3, Group, Mesh, MeshStandardMaterial, Texture, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import { buildDungeonScene } from "./build-dungeon-scene";

describe("buildDungeonScene", () => {
  it("groups ordinary meshes by semantic role", () => {
    const layout = generateMinimumDungeon({ seed: 8, doorOpenRate: 0 });
    const result = buildDungeonScene(layout);

    expect(result.root).toBeInstanceOf(Group);
    expect(result.root.getObjectByName("Floors")).toBeInstanceOf(Group);
    expect(result.root.getObjectByName("Walls")).toBeInstanceOf(Group);
    expect(result.root.getObjectByName("Shells")).toBeInstanceOf(Group);
    expect(result.root.getObjectByName("Doors")).toBeInstanceOf(Group);
    expect(result.root.getObjectByProperty("type", "Mesh")).toBeInstanceOf(Mesh);
    expect(result.counts.floors).toBeGreaterThan(0);
    expect(result.counts.walls).toBeGreaterThan(0);
    expect(result.counts.doors).toBe(2);
  });

  it("keeps the generated model centered and within its logical map", () => {
    const layout = generateMinimumDungeon({ seed: 8 });
    const { root } = buildDungeonScene(layout);
    const bounds = new Box3().setFromObject(root);
    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());

    expect(Math.abs(center.x)).toBeLessThan(1);
    expect(Math.abs(center.z)).toBeLessThan(1);
    expect(size.x).toBeLessThanOrEqual(layout.grid.width);
    expect(size.z).toBeLessThanOrEqual(layout.grid.height);
  });

  it("places export metadata on the root without non-unit scaling", () => {
    const layout = generateMinimumDungeon({ seed: 9 });
    const { root } = buildDungeonScene(layout);

    expect(root.scale.toArray()).toEqual([1, 1, 1]);
    expect(root.userData).toEqual(
      expect.objectContaining({
        exportId: layout.exportId,
        schemaVersion: 1,
        generatorVersion: layout.generatorVersion,
      }),
    );
  });

  it("renders all multi-room modular geometry by semantic role", () => {
    const layout = generateDungeon({
      seed: 104729,
      parameters: { ...DEFAULT_DUNGEON_PARAMETERS, roomCornerStyle: "column" },
    });
    const result = buildDungeonScene(layout);

    expect(result.counts.floors).toBeGreaterThanOrEqual(layout.rooms.length + layout.corridors.length);
    expect(result.counts.shells).toBe(0);
    expect(result.counts.walls).toBeGreaterThan(0);
    expect(result.counts.doors).toBe(layout.doors.length * 2);
  });

  it("uses traceable Kenney Building Kit geometry", () => {
    const layout = generateDungeon({
      seed: 104729,
      parameters: { ...DEFAULT_DUNGEON_PARAMETERS, roomCornerStyle: "column" },
    });
    const { root } = buildDungeonScene(layout);
    const roundedRoot = buildDungeonScene(generateDungeon({
      seed: 104729,
      parameters: { ...DEFAULT_DUNGEON_PARAMETERS, roomCornerStyle: "round" },
    })).root;
    const diagonalRoot = buildDungeonScene(generateDungeon({
      seed: 104729,
      parameters: { ...DEFAULT_DUNGEON_PARAMETERS, roomCornerStyle: "diagonal" },
    })).root;
    const expectedSources = {
      floor: ["floor", "floor-corner-diagonal", "floor-corner-round"],
      wall: ["wall", "wall-corner-column", "wall-corner-diagonal", "wall-corner-round"],
      "door-frame": ["wall-doorway-square", "wall-doorway-round"],
      "door-open": ["door-rotate-square-c", "door-rotate-round-c"],
      "door-closed": ["door-rotate-square-c", "door-rotate-round-c"],
    } as const;
    const meshes = [
      ...root.getObjectsByProperty("type", "Mesh"),
      ...roundedRoot.getObjectsByProperty("type", "Mesh"),
      ...diagonalRoot.getObjectsByProperty("type", "Mesh"),
    ] as Mesh[];

    expect(root.userData).toEqual(expect.objectContaining({
      visualPackId: "kenney-building-kit-1.0",
      visualPackLicense: "CC0-1.0",
    }));
    for (const [kind, sourceModels] of Object.entries(expectedSources)) {
      const mesh = meshes.find((candidate) => candidate.userData.kind === kind);
      expect(mesh, `Missing rendered ${kind}`).toBeDefined();
      expect(mesh!.userData).toEqual(expect.objectContaining({
        visualPackId: "kenney-building-kit-1.0",
      }));
      expect(sourceModels).toContain(mesh!.userData.sourceModel);
      expect(mesh!.geometry.getAttribute("color").count).toBe(mesh!.geometry.getAttribute("position").count);
    }
    for (const sourceModel of ["wall-corner-column", "wall-corner-diagonal", "wall-corner-round", "floor-corner-diagonal", "floor-corner-round"]) {
      expect(meshes.some((mesh) => mesh.userData.sourceModel === sourceModel), `Missing source ${sourceModel}`).toBe(true);
    }
    const columnDoorModels = root.getObjectsByProperty("type", "Mesh")
      .filter((mesh) => ["door-frame", "door-open", "door-closed"].includes(mesh.userData.kind))
      .map((mesh) => mesh.userData.sourceModel);
    const roundedDoorModels = [...roundedRoot.getObjectsByProperty("type", "Mesh"), ...diagonalRoot.getObjectsByProperty("type", "Mesh")]
      .filter((mesh) => ["door-frame", "door-open", "door-closed"].includes(mesh.userData.kind))
      .map((mesh) => mesh.userData.sourceModel);
    expect(new Set(columnDoorModels)).toEqual(new Set(["wall-doorway-square", "door-rotate-square-c"]));
    expect(new Set(roundedDoorModels)).toEqual(new Set(["wall-doorway-round", "door-rotate-round-c"]));
    expect(meshes.every((mesh) => mesh.userData.visualPackId === "kenney-building-kit-1.0")).toBe(true);
  });

  it("textures floors, walls, and frames while preserving Kenney door-leaf colors", () => {
    const layout = generateDungeon({
      seed: 104729,
      parameters: { ...DEFAULT_DUNGEON_PARAMETERS, doorOpenRate: [1, 1] },
    });
    const floorTexture = new Texture();
    const wallTexture = new Texture();
    const doorFrameTexture = new Texture();
    const { root } = buildDungeonScene(layout, {
      appearance: {
        materialPackId: "bricks-and-tiles-1.0",
        wallTextureId: "bt-2-001",
        floorTextureId: "bt-2-002",
        doorFrameTextureId: "follow-wall",
        wallCoverageMeters: 2,
        floorCoverageMeters: 2,
        doorFrameCoverageMeters: 2,
      },
      textures: { floor: floorTexture, wall: wallTexture, doorFrame: doorFrameTexture },
    });
    const meshes = root.getObjectsByProperty("type", "Mesh") as Mesh[];
    const floor = meshes.find((mesh) => mesh.userData.kind === "floor")!;
    const wall = meshes.find((mesh) => mesh.userData.kind === "wall")!;
    const frame = meshes.find((mesh) => mesh.userData.kind === "door-frame")!;
    const door = meshes.find((mesh) => mesh.userData.kind === "door-open")!;

    expect((floor.material as MeshStandardMaterial).map).toBe(floorTexture);
    expect((wall.material as MeshStandardMaterial).map).toBe(wallTexture);
    expect((frame.material as MeshStandardMaterial).map).toBe(doorFrameTexture);
    expect(floor.geometry.getAttribute("uv").count).toBe(floor.geometry.getAttribute("position").count);
    expect(wall.geometry.getAttribute("uv").count).toBe(wall.geometry.getAttribute("position").count);
    expect(frame.geometry.getAttribute("uv").count).toBe(frame.geometry.getAttribute("position").count);
    expect((door.material as MeshStandardMaterial).map).toBeNull();
    expect((door.material as MeshStandardMaterial).vertexColors).toBe(true);
  });
});
