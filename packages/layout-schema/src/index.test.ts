import { describe, expect, it } from "vitest";

import {
  assertDungeonLayout,
  isDungeonLayout,
  type DungeonLayout,
  type DungeonParameters,
  type ResolvedDungeonParameters,
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

const dungeonParameters: DungeonParameters = {
  width: 160,
  height: 160,
  mode: "random",
  layoutWeights: { hub: 0.33, ring: 0.34, branch: 0.33 },
  largeCellSize: [22, 38],
  roomRate: [0.25, 0.5],
  roomSize: [0.8, 1.2],
  roomMinSize: [10, 14],
  roomMaxSize: [28, 36],
  roomCountMin: [5, 7],
  roomCountMax: [20, 28],
  corridorWidth: [4, 4],
  loopRate: [0.2, 0.4],
  deadEndRate: [0.15, 0.25],
  branchTryMultiplier: [8, 12],
  branchFromProtectedChance: [0.1, 0.3],
  linearWingChance: [0.28, 0.38],
  mirrorXChance: [0.4, 0.6],
  doorOpenRate: [0.2, 0.8],
};

const resolvedParameters: ResolvedDungeonParameters = {
  width: 160,
  height: 160,
  topology: "ring",
  largeCellSize: 30,
  roomRate: 0.4,
  roomSize: 1,
  roomMinSize: 12,
  roomMaxSize: 32,
  roomCountMin: 6,
  roomCountMax: 24,
  roomCount: 10,
  corridorWidth: 4,
  loopRate: 0.3,
  deadEndRate: 0.2,
  branchTryMultiplier: 10,
  branchFromProtectedChance: 0.2,
  linearWingChance: 0.33,
  mirrorXChance: 0.5,
  doorOpenRate: 0.5,
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

  it("accepts the full multi-room parameter contract and topology diagnostics", () => {
    const layout: DungeonLayout = {
      ...validLayout,
      parameters: dungeonParameters,
      resolvedParameters,
      diagnostics: {
        warnings: [],
        topology: {
          mode: "ring",
          roomCount: 10,
          edgeCount: 11,
          loopCount: 2,
          deadEndCount: 1,
          attempts: 14,
        },
      },
    };

    expect(assertDungeonLayout(layout)).toBe(layout);
  });

  it("rejects a reversed parameter range", () => {
    const layout = {
      ...validLayout,
      parameters: { ...dungeonParameters, roomMinSize: [14, 10] },
      resolvedParameters,
    };

    expect(isDungeonLayout(layout)).toBe(false);
  });
});
