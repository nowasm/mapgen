import { describe, expect, it } from "vitest";

import { DEFAULT_DUNGEON_PARAMETERS } from "./default-parameters";
import { generateDungeon } from "./generate-dungeon";

describe("doorway-aware modular geometry", () => {
  it("emits one floor per room and corridor, without corridor end caps", () => {
    const layout = generateDungeon({ seed: 42 });
    const floors = layout.modules.filter(({ kind }) => kind === "floor");

    expect(floors).toHaveLength(layout.rooms.length + layout.corridors.length);
    for (const corridor of layout.corridors) {
      expect(layout.modules.filter(({ id }) => id.startsWith(`module-${corridor.id}-wall-`))).toHaveLength(2);
    }
  });

  it("cuts every doorway out of the full-height room walls", () => {
    const layout = generateDungeon({ seed: 17 });
    const fullHeightWalls = layout.modules.filter(({ kind, size }) => kind === "wall" && size[1] === 2.5);

    for (const door of layout.doors) {
      const [x, , z] = door.position;
      const blockingWall = fullHeightWalls.find((wall) => (
        Math.abs(x - wall.center[0]) < wall.size[0] / 2 &&
        Math.abs(z - wall.center[2]) < wall.size[2] / 2
      ));
      expect(blockingWall).toBeUndefined();
    }
  });

  it("adds collision only to closed doors", () => {
    const closed = generateDungeon({
      seed: 9,
      parameters: { ...DEFAULT_DUNGEON_PARAMETERS, doorOpenRate: [0, 0] },
    });
    const open = generateDungeon({
      seed: 9,
      parameters: { ...DEFAULT_DUNGEON_PARAMETERS, doorOpenRate: [1, 1] },
    });

    expect(closed.colliders.filter(({ kind }) => kind === "door")).toHaveLength(closed.doors.length);
    expect(open.colliders.filter(({ kind }) => kind === "door")).toHaveLength(0);
    expect(closed.modules.filter(({ kind }) => kind === "door-closed")).toHaveLength(closed.doors.length);
    expect(open.modules.filter(({ kind }) => kind === "door-open")).toHaveLength(open.doors.length);
  });

  it("keeps all generated collider sizes positive", () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const layout = generateDungeon({ seed });
      expect(layout.colliders.length).toBeGreaterThan(0);
      expect(layout.colliders.every(({ size }) => size.every((component) => component > 0))).toBe(true);
    }
  });

  it("butt-joins full-height wall boxes instead of intersecting them", () => {
    const layout = generateDungeon({ seed: 42 });
    const walls = layout.modules.filter(({ kind, size }) => kind === "wall" && size[1] === 2.5);
    const axes = [0, 1, 2] as const;

    for (let leftIndex = 0; leftIndex < walls.length; leftIndex += 1) {
      const left = walls[leftIndex]!;
      for (const right of walls.slice(leftIndex + 1)) {
        const overlap = axes.map((axis) => (
          Math.min(left.center[axis] + left.size[axis] / 2, right.center[axis] + right.size[axis] / 2) -
          Math.max(left.center[axis] - left.size[axis] / 2, right.center[axis] - right.size[axis] / 2)
        ));
        expect(overlap.every((component) => component > 0.000_001), `${left.id} intersects ${right.id}`).toBe(false);
      }
    }
  });

  it("builds each doorway from a clear-sized door and three non-overlapping frame pieces", () => {
    const layout = generateDungeon({
      seed: 9,
      parameters: { ...DEFAULT_DUNGEON_PARAMETERS, doorOpenRate: [0, 0] },
    });

    for (const door of layout.doors) {
      const leaf = layout.modules.find(({ id }) => id === `module-${door.id}`);
      const frames = layout.modules.filter(({ id }) => id.startsWith(`module-${door.id}-frame-`));

      expect(leaf?.size).toEqual([0.3, 2.1, layout.resolvedParameters!.corridorWidth - 0.6]);
      expect(leaf?.center[1]).toBe(1.05);
      expect(frames).toHaveLength(3);
      expect(frames.filter(({ id }) => id.endsWith("lintel"))).toHaveLength(1);
      expect(frames.filter(({ id }) => id.includes("jamb"))).toHaveLength(2);
    }
  });
});
