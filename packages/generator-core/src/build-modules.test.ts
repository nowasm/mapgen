import { describe, expect, it } from "vitest";

import { DEFAULT_DUNGEON_PARAMETERS } from "./default-parameters";
import { generateDungeon } from "./generate-dungeon";

describe("doorway-aware modular geometry", () => {
  it("emits modular room floors and one corridor floor without prefab shells", () => {
    const layout = generateDungeon({ seed: 42 });

    expect(layout.modules.filter(({ kind }) => kind === "room-shell" || kind === "corridor-shell")).toHaveLength(0);
    for (const room of layout.rooms) {
      expect(layout.modules.filter(({ id, kind }) => kind === "floor" && id.startsWith(`module-${room.id}-floor`))).toHaveLength(7);
    }
    for (const corridor of layout.corridors) {
      expect(layout.modules.filter(({ id }) => id === `module-${corridor.id}-floor`)).toHaveLength(1);
      expect(layout.colliders.filter(({ id }) => id.startsWith(`collider-${corridor.id}-wall-`))).toHaveLength(2);
      expect(layout.modules.filter(({ id }) => id.startsWith(`module-${corridor.id}-wall-`))).toHaveLength(2);
    }
  });

  it("keeps side walls on a corridor whose length is shorter than its width", () => {
    const layout = generateDungeon({
      seed: 2,
      parameters: { ...DEFAULT_DUNGEON_PARAMETERS, mode: "hub" },
    });
    const corridor = layout.corridors.find(({ orientation, width, depth }) => (
      orientation === "vertical" && depth < width
    ));

    expect(corridor).toBeDefined();
    const walls = layout.modules.filter(({ id }) => id.startsWith(`module-${corridor!.id}-wall-`));
    expect(walls).toHaveLength(2);
    expect(walls.every(({ size }) => size[0] === 0.2 && size[2] === corridor!.depth)).toBe(true);
    expect(walls.map(({ center }) => center[0]).sort((a, b) => a - b)).toEqual([
      corridor!.x - layout.grid.width / 2,
      corridor!.x + corridor!.width - layout.grid.width / 2,
    ]);
  });

  it("builds every rounded room from four native floor and wall corners", () => {
    const layout = generateDungeon({
      seed: 314159,
      parameters: {
        ...DEFAULT_DUNGEON_PARAMETERS,
        roomCornerStyle: "round",
        roomVariationRate: [1, 1],
      },
    });
    for (const room of layout.rooms) {
      const wallCorners = layout.modules.filter(({ id, assetKey }) => id.startsWith(`module-${room.id}-`) && assetKey === "wall-corner-round");
      const floorCorners = layout.modules.filter(({ id, assetKey }) => id.startsWith(`module-${room.id}-`) && assetKey === "floor-corner-round");
      const arcColliders = layout.colliders.filter(({ id }) => id.startsWith(`collider-${room.id}-`) && id.includes("-arc-"));
      expect(wallCorners).toHaveLength(4);
      expect(floorCorners).toHaveLength(4);
      expect(arcColliders).toHaveLength(24);
    }
  });

  it.each([
    { style: "column" as const, wallAsset: "wall-corner-column", floorAsset: undefined, cornerColliderCount: 8 },
    { style: "diagonal" as const, wallAsset: "wall-corner-diagonal", floorAsset: "floor-corner-diagonal", cornerColliderCount: 4 },
    { style: "round" as const, wallAsset: "wall-corner-round", floorAsset: "floor-corner-round", cornerColliderCount: 24 },
  ])("builds closed $style corners from the matching native modules", ({ style, wallAsset, floorAsset, cornerColliderCount }) => {
    const layout = generateDungeon({
      seed: 271828,
      parameters: { ...DEFAULT_DUNGEON_PARAMETERS, roomCornerStyle: style },
    });
    const room = layout.rooms[0]!;
    const cornerNames = ["north-west", "north-east", "south-east", "south-west"];
    const wallCorners = layout.modules.filter(({ id, assetKey }) => (
      cornerNames.some((name) => id === `module-${room.id}-${name}-corner`) && assetKey === wallAsset
    ));
    const floorCorners = layout.modules.filter(({ id, assetKey }) => (
      cornerNames.some((name) => id === `module-${room.id}-floor-${name}`) && assetKey === floorAsset
    ));
    const cornerColliders = layout.colliders.filter(({ id }) => (
      id.startsWith(`collider-${room.id}-`) && cornerNames.some((name) => id.includes(name))
    ));

    expect(wallCorners).toHaveLength(4);
    expect(floorCorners).toHaveLength(floorAsset ? 4 : 0);
    expect(cornerColliders).toHaveLength(cornerColliderCount);
  });

  it("orients every native rounded floor and wall corner toward the room interior", () => {
    const layout = generateDungeon({
      seed: 314159,
      parameters: { ...DEFAULT_DUNGEON_PARAMETERS, roomCornerStyle: "round" },
    });
    const room = layout.rooms[0]!;
    const expectedRotations = {
      "north-west": Math.PI,
      "north-east": Math.PI / 2,
      "south-east": 0,
      "south-west": -Math.PI / 2,
    } as const;

    for (const [corner, rotation] of Object.entries(expectedRotations)) {
      const wall = layout.modules.find(({ id }) => id === `module-${room.id}-${corner}-corner`);
      const floor = layout.modules.find(({ id }) => id === `module-${room.id}-floor-${corner}`);
      expect(wall?.assetKey).toBe("wall-corner-round");
      expect(floor?.assetKey).toBe("floor-corner-round");
      expect(wall?.rotationY).toBe(rotation);
      expect(floor?.rotationY).toBe(rotation);
    }
  });

  it("cuts every doorway out of the full-height room walls", () => {
    const layout = generateDungeon({ seed: 17 });
    const fullHeightWalls = layout.modules.filter(({ kind, size, assetKey }) => kind === "wall" && size[1] === 3.2 && assetKey === "wall");

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

  it("swings open leaves around a side hinge instead of the doorway center", () => {
    const layout = generateDungeon({
      seed: 9,
      parameters: { ...DEFAULT_DUNGEON_PARAMETERS, doorOpenRate: [1, 1] },
    });

    for (const door of layout.doors) {
      const leaves = layout.modules.filter(({ id }) => id === `module-${door.id}-leaf`);
      expect(leaves).toHaveLength(1);
      expect(leaves.every((leaf) => Math.abs(leaf.rotationY - door.rotationY) > 1)).toBe(true);
      expect(leaves.every((leaf) => Math.hypot(leaf.center[0] - door.position[0], leaf.center[2] - door.position[2]) > 0.4)).toBe(true);
    }
  });

  it("swings every open leaf toward its adjacent room", () => {
    const layout = generateDungeon({
      seed: 9,
      parameters: { ...DEFAULT_DUNGEON_PARAMETERS, doorOpenRate: [1, 1] },
    });

    for (const door of layout.doors) {
      expect(door).toHaveProperty("roomId");
      const roomId = (door as typeof door & { roomId: string }).roomId;
      const room = layout.rooms.find(({ id }) => id === roomId)!;
      const roomCenterX = room.x + room.width / 2 - layout.grid.width / 2;
      const roomCenterZ = room.z + room.depth / 2 - layout.grid.height / 2;
      const roomDirectionX = roomCenterX - door.position[0];
      const roomDirectionZ = roomCenterZ - door.position[2];
      const leaves = layout.modules.filter(({ id }) => id === `module-${door.id}-leaf`);
      for (const leaf of leaves) {
        const movementX = leaf.center[0] - door.position[0];
        const movementZ = leaf.center[2] - door.position[2];
        expect(movementX * roomDirectionX + movementZ * roomDirectionZ).toBeGreaterThan(0);
      }
    }
  });

  it("keeps all generated collider sizes positive", () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const layout = generateDungeon({ seed });
      expect(layout.colliders.length).toBeGreaterThan(0);
      expect(layout.colliders.every(({ size }) => size.every((component) => component > 0))).toBe(true);
    }
  });

  it("butt-joins full-height wall boxes instead of intersecting them", () => {
    const layout = generateDungeon({
      seed: 42,
      parameters: { ...DEFAULT_DUNGEON_PARAMETERS, roomCornerStyle: "column" },
    });
    const walls = layout.modules.filter(({ id, kind, size, assetKey }) => kind === "wall" && size[1] === 3.2 && assetKey === "wall" && !id.includes("corridor"));
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

  it.each([
    { cornerStyle: "column" as const, frameAsset: "frame-square", leafAsset: "door-square-c" },
    { cornerStyle: "diagonal" as const, frameAsset: "frame-round", leafAsset: "door-round-c" },
    { cornerStyle: "round" as const, frameAsset: "frame-round", leafAsset: "door-round-c" },
  ])("keeps the original narrow $cornerStyle door size inside a 4m corridor", ({ cornerStyle, frameAsset, leafAsset }) => {
    const layout = generateDungeon({
      seed: 9,
      parameters: { ...DEFAULT_DUNGEON_PARAMETERS, roomCornerStyle: cornerStyle, doorOpenRate: [0, 0] },
    });

    for (const door of layout.doors) {
      const leaves = layout.modules.filter(({ id }) => id === `module-${door.id}-leaf`);
      const frames = layout.modules.filter(({ id }) => id === `module-${door.id}-frame`);
      const headers = layout.modules.filter(({ id }) => id === `module-${door.id}-wall-header`);
      const frameColliders = layout.colliders.filter(({ id }) => id.startsWith(`collider-${door.id}-frame-`));

      expect(leaves).toHaveLength(1);
      expect(leaves[0]?.assetKey).toBe(leafAsset);
      expect(leaves[0]?.size).toEqual([0.25, 2.1, 0.925]);
      expect(leaves.every(({ center }) => center[1] === 1.05)).toBe(true);
      expect(frames).toHaveLength(1);
      expect(frames[0]?.size).toEqual([0.2, 2.4, 2]);
      expect(frames[0]?.assetKey).toBe(frameAsset);
      expect(headers).toHaveLength(1);
      expect(headers[0]?.size).toEqual([0.2, 0.8, 2]);
      expect(frameColliders).toHaveLength(3);
    }
  });
});
