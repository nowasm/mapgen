import type { ConcreteLayoutMode } from "@mapgen/layout-schema";
import { describe, expect, it } from "vitest";

import { DEFAULT_DUNGEON_PARAMETERS } from "./default-parameters";
import { generateDungeon } from "./generate-dungeon";

function overlaps(a: { x: number; z: number; width: number; depth: number }, b: typeof a): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.z < b.z + b.depth && a.z + a.depth > b.z;
}

describe("multi-room placement", () => {
  it.each(["hub", "ring", "branch"] as const)("fits 100 deterministic %s layouts inside the map", (mode: ConcreteLayoutMode) => {
    for (let seed = 0; seed < 100; seed += 1) {
      const layout = generateDungeon({
        seed,
        parameters: { ...DEFAULT_DUNGEON_PARAMETERS, mode },
      });

      expect(layout.rooms.length).toBe(layout.resolvedParameters!.roomCount);
      for (const room of layout.rooms) {
        expect(room.x).toBeGreaterThanOrEqual(0);
        expect(room.z).toBeGreaterThanOrEqual(0);
        expect(room.x + room.width).toBeLessThanOrEqual(layout.grid.width);
        expect(room.z + room.depth).toBeLessThanOrEqual(layout.grid.height);
      }
      for (let a = 0; a < layout.rooms.length; a += 1) {
        for (let b = a + 1; b < layout.rooms.length; b += 1) {
          expect(overlaps(layout.rooms[a]!, layout.rooms[b]!)).toBe(false);
        }
      }
      for (const corridor of layout.corridors) {
        expect(corridor.x).toBeGreaterThanOrEqual(0);
        expect(corridor.z).toBeGreaterThanOrEqual(0);
        expect(corridor.x + corridor.width).toBeLessThanOrEqual(layout.grid.width);
        expect(corridor.z + corridor.depth).toBeLessThanOrEqual(layout.grid.height);
        expect(
          corridor.width === layout.resolvedParameters!.corridorWidth ||
          corridor.depth === layout.resolvedParameters!.corridorWidth,
        ).toBe(true);
      }
    }
  });

  it("creates valid room, corridor, door, and spawn references", () => {
    const layout = generateDungeon({ seed: 2026 });
    const roomIds = new Set(layout.rooms.map(({ id }) => id));
    const corridorIds = new Set(layout.corridors.map(({ id }) => id));
    const doorIds = new Set(layout.doors.map(({ id }) => id));
    const entrance = layout.rooms.find(({ kind }) => kind === "entrance")!;

    for (const connection of layout.connections) {
      expect(roomIds.has(connection.fromRoomId)).toBe(true);
      expect(roomIds.has(connection.toRoomId)).toBe(true);
      expect(corridorIds.has(connection.corridorId)).toBe(true);
      expect(connection.doorIds).toHaveLength(2);
      expect(connection.doorIds.every((id) => doorIds.has(id))).toBe(true);
    }
    expect(layout.spawn.position[0]).toBeGreaterThan(entrance.x - layout.grid.width / 2);
    expect(layout.spawn.position[0]).toBeLessThan(entrance.x + entrance.width - layout.grid.width / 2);
    expect(layout.spawn.position[2]).toBeGreaterThan(entrance.z - layout.grid.height / 2);
    expect(layout.spawn.position[2]).toBeLessThan(entrance.z + entrance.depth - layout.grid.height / 2);
  });

  it.each(["hub", "ring", "branch"] as const)("fits the maximum default-size %s candidate", (mode) => {
    const layout = generateDungeon({
      seed: 99,
      parameters: {
        ...DEFAULT_DUNGEON_PARAMETERS,
        mode,
        roomRate: [1, 1],
        roomCountMin: [12, 12],
        roomCountMax: [40, 40],
      },
    });

    expect(layout.rooms).toHaveLength(40);
  });
});
