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
});
