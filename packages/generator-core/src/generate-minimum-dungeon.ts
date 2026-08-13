import {
  assertDungeonLayout,
  type ColliderDefinition,
  type DungeonLayout,
  type MinimumDungeonParameters,
  type ModuleDefinition,
  type RoomDefinition,
  type Vec3,
} from "@mapgen/layout-schema";

import { Mulberry32 } from "./random";

export interface GenerateMinimumDungeonOptions {
  readonly seed: number;
  readonly width?: number;
  readonly height?: number;
  readonly corridorWidth?: number;
  readonly doorOpenRate?: number;
}

const GENERATOR_VERSION = "0.1.0-minimum";
const FLOOR_THICKNESS = 0.2;
const WALL_HEIGHT = 2.5;
const WALL_THICKNESS = 0.3;

function integerInRange(value: number, minimum: number, maximum: number, name: string): number {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be an integer from ${minimum} to ${maximum}`);
  }
  return value;
}

function normalizedParameters(options: GenerateMinimumDungeonOptions): MinimumDungeonParameters {
  const width = integerInRange(options.width ?? 160, 32, 512, "width");
  const height = integerInRange(options.height ?? 160, 24, 512, "height");
  const corridorWidth = integerInRange(options.corridorWidth ?? 4, 2, 8, "corridorWidth");
  const doorOpenRate = options.doorOpenRate ?? 0.5;
  if (!Number.isFinite(doorOpenRate) || doorOpenRate < 0 || doorOpenRate > 1) {
    throw new RangeError("doorOpenRate must be from 0 to 1");
  }
  if (corridorWidth + 4 > height) {
    throw new RangeError("corridorWidth leaves insufficient vertical clearance");
  }
  return { width, height, corridorWidth, doorOpenRate };
}

function worldCenter(
  x: number,
  z: number,
  width: number,
  depth: number,
  gridWidth: number,
  gridHeight: number,
  y: number,
): Vec3 {
  return [x + width / 2 - gridWidth / 2, y, z + depth / 2 - gridHeight / 2];
}

function addBox(
  colliders: ColliderDefinition[],
  modules: ModuleDefinition[],
  id: string,
  kind: "floor" | "wall",
  center: Vec3,
  size: Vec3,
): void {
  colliders.push({ id: `collider-${id}`, kind, center, size });
  modules.push({ id: `module-${id}`, kind, center, size, rotationY: 0 });
}

function addRoomFloor(
  room: RoomDefinition,
  parameters: MinimumDungeonParameters,
  colliders: ColliderDefinition[],
  modules: ModuleDefinition[],
): void {
  addBox(
    colliders,
    modules,
    `${room.id}-floor`,
    "floor",
    worldCenter(room.x, room.z, room.width, room.depth, parameters.width, parameters.height, -FLOOR_THICKNESS / 2),
    [room.width, FLOOR_THICKNESS, room.depth],
  );
}

function addRoomWalls(
  room: RoomDefinition,
  doorwaySide: "east" | "west",
  parameters: MinimumDungeonParameters,
  colliders: ColliderDefinition[],
  modules: ModuleDefinition[],
): void {
  const minX = room.x - parameters.width / 2;
  const maxX = room.x + room.width - parameters.width / 2;
  const minZ = room.z - parameters.height / 2;
  const maxZ = room.z + room.depth - parameters.height / 2;
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const wallY = WALL_HEIGHT / 2;

  addBox(colliders, modules, `${room.id}-north-wall`, "wall", [centerX, wallY, minZ], [room.width, WALL_HEIGHT, WALL_THICKNESS]);
  addBox(colliders, modules, `${room.id}-south-wall`, "wall", [centerX, wallY, maxZ], [room.width, WALL_HEIGHT, WALL_THICKNESS]);

  const solidSide = doorwaySide === "east" ? minX : maxX;
  addBox(colliders, modules, `${room.id}-solid-wall`, "wall", [solidSide, wallY, centerZ], [WALL_THICKNESS, WALL_HEIGHT, room.depth]);

  const doorwayX = doorwaySide === "east" ? maxX : minX;
  const segmentDepth = (room.depth - parameters.corridorWidth) / 2;
  const topCenterZ = minZ + segmentDepth / 2;
  const bottomCenterZ = maxZ - segmentDepth / 2;
  addBox(colliders, modules, `${room.id}-door-wall-a`, "wall", [doorwayX, wallY, topCenterZ], [WALL_THICKNESS, WALL_HEIGHT, segmentDepth]);
  addBox(colliders, modules, `${room.id}-door-wall-b`, "wall", [doorwayX, wallY, bottomCenterZ], [WALL_THICKNESS, WALL_HEIGHT, segmentDepth]);
}

export function generateMinimumDungeon(options: GenerateMinimumDungeonOptions): DungeonLayout {
  const seed = integerInRange(options.seed, 0, 0xffff_ffff, "seed");
  const parameters = normalizedParameters(options);
  const random = new Mulberry32(seed);

  const roomWidth = Math.max(10, Math.min(28, Math.floor(parameters.width * 0.22)));
  const roomDepth = Math.max(parameters.corridorWidth + 6, Math.min(28, Math.floor(parameters.height * 0.3)));
  const corridorLength = Math.max(8, Math.min(24, Math.floor(parameters.width * 0.15)));
  const totalWidth = roomWidth * 2 + corridorLength;
  if (totalWidth + 4 > parameters.width) {
    throw new RangeError("map width is too small for the minimum dungeon slice");
  }

  const leftX = Math.floor((parameters.width - totalWidth) / 2);
  const roomZ = Math.floor((parameters.height - roomDepth) / 2);
  const rightX = leftX + roomWidth + corridorLength;
  const corridorZ = roomZ + Math.floor((roomDepth - parameters.corridorWidth) / 2);

  const rooms: readonly RoomDefinition[] = [
    { id: "room-entrance", x: leftX, z: roomZ, width: roomWidth, depth: roomDepth, kind: "entrance" },
    { id: "room-exit", x: rightX, z: roomZ, width: roomWidth, depth: roomDepth, kind: "exit" },
  ];
  const corridor = {
    id: "corridor-main",
    x: leftX + roomWidth,
    z: corridorZ,
    width: corridorLength,
    depth: parameters.corridorWidth,
  } as const;

  const leftDoorX = leftX + roomWidth - parameters.width / 2;
  const rightDoorX = rightX - parameters.width / 2;
  const doorZ = corridorZ + parameters.corridorWidth / 2 - parameters.height / 2;
  const doors = [
    { id: "door-entrance", position: [leftDoorX, WALL_HEIGHT / 2, doorZ] as Vec3, rotationY: 0, open: random.next() < parameters.doorOpenRate },
    { id: "door-exit", position: [rightDoorX, WALL_HEIGHT / 2, doorZ] as Vec3, rotationY: 0, open: random.next() < parameters.doorOpenRate },
  ] as const;

  const colliders: ColliderDefinition[] = [];
  const modules: ModuleDefinition[] = [];
  for (const room of rooms) addRoomFloor(room, parameters, colliders, modules);
  addRoomWalls(rooms[0]!, "east", parameters, colliders, modules);
  addRoomWalls(rooms[1]!, "west", parameters, colliders, modules);

  addBox(
    colliders,
    modules,
    "corridor-floor",
    "floor",
    worldCenter(corridor.x, corridor.z, corridor.width, corridor.depth, parameters.width, parameters.height, -FLOOR_THICKNESS / 2),
    [corridor.width, FLOOR_THICKNESS, corridor.depth],
  );
  const corridorCenterX = corridor.x + corridor.width / 2 - parameters.width / 2;
  const corridorMinZ = corridor.z - parameters.height / 2;
  const corridorMaxZ = corridor.z + corridor.depth - parameters.height / 2;
  addBox(colliders, modules, "corridor-north-wall", "wall", [corridorCenterX, WALL_HEIGHT / 2, corridorMinZ], [corridor.width, WALL_HEIGHT, WALL_THICKNESS]);
  addBox(colliders, modules, "corridor-south-wall", "wall", [corridorCenterX, WALL_HEIGHT / 2, corridorMaxZ], [corridor.width, WALL_HEIGHT, WALL_THICKNESS]);

  for (const door of doors) {
    modules.push({
      id: `module-${door.id}`,
      kind: door.open ? "door-open" : "door-closed",
      center: door.position,
      size: [WALL_THICKNESS, WALL_HEIGHT, parameters.corridorWidth],
      rotationY: door.open ? Math.PI / 2 : 0,
    });
    if (!door.open) {
      colliders.push({
        id: `collider-${door.id}`,
        kind: "door",
        center: door.position,
        size: [WALL_THICKNESS, WALL_HEIGHT, parameters.corridorWidth],
      });
    }
  }

  const entrance = rooms[0]!;
  const spawn: Vec3 = [
    entrance.x + entrance.width * 0.35 - parameters.width / 2,
    0.1,
    entrance.z + entrance.depth / 2 - parameters.height / 2,
  ];
  const exportId = `minimum-${seed.toString(16).padStart(8, "0")}-${parameters.width}x${parameters.height}`;

  return assertDungeonLayout({
    schemaVersion: 1,
    generatorVersion: GENERATOR_VERSION,
    exportId,
    seed,
    parameters,
    grid: { width: parameters.width, height: parameters.height, cellSize: 1 },
    coordinateSystem: { up: "Y", forward: "-Z", handedness: "right" },
    assetPack: { id: "dungeon-collection-2", version: "1" },
    rooms,
    connections: [{
      id: "connection-main",
      fromRoomId: "room-entrance",
      toRoomId: "room-exit",
      corridorId: corridor.id,
      doorIds: doors.map(({ id }) => id),
    }],
    corridors: [corridor],
    doors,
    spawn: { position: spawn, rotationY: -Math.PI / 2 },
    modules,
    colliders,
    diagnostics: { warnings: ["Minimum slice uses procedural placeholder modules."] },
  });
}
