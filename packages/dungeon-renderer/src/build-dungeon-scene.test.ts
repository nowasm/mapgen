import { generateDungeon, generateMinimumDungeon } from "@mapgen/generator-core";
import { Box3, Group, Mesh, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import { buildDungeonScene } from "./build-dungeon-scene";

describe("buildDungeonScene", () => {
  it("groups ordinary meshes by semantic role", () => {
    const layout = generateMinimumDungeon({ seed: 8, doorOpenRate: 0 });
    const result = buildDungeonScene(layout);

    expect(result.root).toBeInstanceOf(Group);
    expect(result.root.getObjectByName("Floors")).toBeInstanceOf(Group);
    expect(result.root.getObjectByName("Walls")).toBeInstanceOf(Group);
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
    const layout = generateDungeon({ seed: 104729 });
    const result = buildDungeonScene(layout);

    expect(result.counts.floors).toBe(layout.rooms.length + layout.corridors.length);
    expect(result.counts.walls).toBeGreaterThan(layout.rooms.length * 4);
    expect(result.counts.doors).toBe(layout.doors.length * 2);
  });
});
