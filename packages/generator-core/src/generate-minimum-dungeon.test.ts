import { describe, expect, it } from "vitest";

import { generateMinimumDungeon } from "./generate-minimum-dungeon";

describe("generateMinimumDungeon", () => {
  it("is deterministic for a seed and parameters", () => {
    expect(generateMinimumDungeon({ seed: 42 })).toEqual(
      generateMinimumDungeon({ seed: 42 }),
    );
  });

  it("creates two connected rooms and one corridor", () => {
    const layout = generateMinimumDungeon({ seed: 42 });

    expect(layout.rooms).toHaveLength(2);
    expect(layout.corridors).toHaveLength(1);
    expect(layout.connections).toEqual([
      expect.objectContaining({
        fromRoomId: "room-entrance",
        toRoomId: "room-exit",
        corridorId: "corridor-main",
      }),
    ]);
  });

  it("places the spawn inside the entrance room", () => {
    const layout = generateMinimumDungeon({ seed: 7 });
    const room = layout.rooms.find(({ id }) => id === "room-entrance");

    expect(room).toBeDefined();
    expect(layout.spawn.position[0]).toBeGreaterThan(room!.x - layout.grid.width / 2);
    expect(layout.spawn.position[0]).toBeLessThan(room!.x + room!.width - layout.grid.width / 2);
    expect(layout.spawn.position[2]).toBeGreaterThan(room!.z - layout.grid.height / 2);
    expect(layout.spawn.position[2]).toBeLessThan(room!.z + room!.depth - layout.grid.height / 2);
  });

  it("creates positive floor and wall colliders within map bounds", () => {
    const layout = generateMinimumDungeon({ seed: 100 });
    const halfWidth = layout.grid.width / 2;
    const halfHeight = layout.grid.height / 2;

    expect(layout.colliders.some(({ kind }) => kind === "floor")).toBe(true);
    expect(layout.colliders.some(({ kind }) => kind === "wall")).toBe(true);
    for (const collider of layout.colliders) {
      expect(collider.size.every((component) => component > 0)).toBe(true);
      expect(Math.abs(collider.center[0])).toBeLessThanOrEqual(halfWidth);
      expect(Math.abs(collider.center[2])).toBeLessThanOrEqual(halfHeight);
    }
  });

  it("reproduces fixed door state from the seed", () => {
    const closed = generateMinimumDungeon({ seed: 1, doorOpenRate: 0 });
    const open = generateMinimumDungeon({ seed: 1, doorOpenRate: 1 });

    expect(closed.doors.every((door) => !door.open)).toBe(true);
    expect(open.doors.every((door) => door.open)).toBe(true);
    expect(closed.colliders.filter(({ kind }) => kind === "door")).toHaveLength(2);
    expect(open.colliders.filter(({ kind }) => kind === "door")).toHaveLength(0);
  });
});
