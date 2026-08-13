import { describe, expect, it } from "vitest";

import {
  assertDungeonLayout,
  isDungeonLayout,
  type DungeonLayout,
} from "./index";

const validLayout: DungeonLayout = {
  schemaVersion: 1,
  generatorVersion: "0.1.0-minimum",
  exportId: "seed-42",
  seed: 42,
  parameters: {
    width: 32,
    height: 24,
    corridorWidth: 4,
    doorOpenRate: 0.5,
  },
  grid: { width: 32, height: 24, cellSize: 1 },
  coordinateSystem: { up: "Y", forward: "-Z", handedness: "right" },
  assetPack: { id: "placeholder-kit", version: "1" },
  rooms: [
    { id: "room-a", x: 2, z: 4, width: 10, depth: 12, kind: "entrance" },
    { id: "room-b", x: 20, z: 4, width: 10, depth: 12, kind: "exit" },
  ],
  connections: [
    {
      id: "connection-a-b",
      fromRoomId: "room-a",
      toRoomId: "room-b",
      corridorId: "corridor-a-b",
      doorIds: ["door-a", "door-b"],
    },
  ],
  corridors: [
    { id: "corridor-a-b", x: 12, z: 8, width: 8, depth: 4 },
  ],
  doors: [
    {
      id: "door-a",
      position: [-4, 1.25, 0],
      rotationY: Math.PI / 2,
      open: true,
    },
  ],
  spawn: { position: [-9, 0.1, 0], rotationY: -Math.PI / 2 },
  modules: [],
  colliders: [
    {
      id: "floor-a",
      kind: "floor",
      center: [-9, -0.1, 0],
      size: [10, 0.2, 12],
    },
  ],
  diagnostics: { warnings: [] },
};

describe("DungeonLayout runtime contract", () => {
  it("accepts a valid version 1 layout", () => {
    expect(isDungeonLayout(validLayout)).toBe(true);
    expect(assertDungeonLayout(validLayout)).toBe(validLayout);
  });

  it("rejects an unknown schema major version", () => {
    expect(isDungeonLayout({ ...validLayout, schemaVersion: 2 })).toBe(false);
    expect(() => assertDungeonLayout({ ...validLayout, schemaVersion: 2 })).toThrow(
      /schemaVersion/,
    );
  });

  it("rejects non-finite vectors", () => {
    const layout = {
      ...validLayout,
      spawn: { ...validLayout.spawn, position: [Number.NaN, 0, 0] },
    };

    expect(isDungeonLayout(layout)).toBe(false);
  });

  it("rejects zero-sized colliders", () => {
    const layout = {
      ...validLayout,
      colliders: [{ ...validLayout.colliders[0], size: [10, 0, 12] }],
    };

    expect(isDungeonLayout(layout)).toBe(false);
  });
});
