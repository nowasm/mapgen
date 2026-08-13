import type {
  ColliderDefinition,
  CorridorDefinition,
  DoorDefinition,
  ModuleDefinition,
  ResolvedDungeonParameters,
  RoomDefinition,
  Vec3,
} from "@mapgen/layout-schema";

import type { PlacedLayout } from "./place-layout";

export interface BuiltModules {
  readonly modules: readonly ModuleDefinition[];
  readonly colliders: readonly ColliderDefinition[];
}

const FLOOR_THICKNESS = 0.2;
const WALL_HEIGHT = 2.5;
const WALL_THICKNESS = 0.3;
const FRAME_HEIGHT = 0.4;

interface Opening {
  readonly start: number;
  readonly end: number;
}

function worldCenter(
  x: number,
  z: number,
  width: number,
  depth: number,
  parameters: ResolvedDungeonParameters,
  y: number,
): Vec3 {
  return [x + width / 2 - parameters.width / 2, y, z + depth / 2 - parameters.height / 2];
}

function addBox(
  modules: ModuleDefinition[],
  colliders: ColliderDefinition[],
  id: string,
  kind: "floor" | "wall",
  center: Vec3,
  size: Vec3,
): void {
  modules.push({ id: `module-${id}`, kind, center, size, rotationY: 0 });
  colliders.push({ id: `collider-${id}`, kind, center, size });
}

function subtractOpenings(start: number, end: number, openings: readonly Opening[]): readonly Opening[] {
  const merged: Opening[] = [];
  for (const opening of [...openings].sort((a, b) => a.start - b.start)) {
    const clipped = { start: Math.max(start, opening.start), end: Math.min(end, opening.end) };
    if (clipped.end <= clipped.start) continue;
    const previous = merged[merged.length - 1];
    if (previous && clipped.start <= previous.end) {
      merged[merged.length - 1] = { start: previous.start, end: Math.max(previous.end, clipped.end) };
    } else {
      merged.push(clipped);
    }
  }
  const segments: Opening[] = [];
  let cursor = start;
  for (const opening of merged) {
    if (opening.start > cursor) segments.push({ start: cursor, end: opening.start });
    cursor = Math.max(cursor, opening.end);
  }
  if (cursor < end) segments.push({ start: cursor, end });
  return segments;
}

function roomDoors(room: RoomDefinition, doors: readonly DoorDefinition[], parameters: ResolvedDungeonParameters): {
  north: Opening[];
  south: Opening[];
  west: Opening[];
  east: Opening[];
} {
  const bounds = {
    west: room.x - parameters.width / 2,
    east: room.x + room.width - parameters.width / 2,
    north: room.z - parameters.height / 2,
    south: room.z + room.depth - parameters.height / 2,
  };
  const result = { north: [] as Opening[], south: [] as Opening[], west: [] as Opening[], east: [] as Opening[] };
  const half = parameters.corridorWidth / 2;
  for (const door of doors) {
    const [x, , z] = door.position;
    if (Math.abs(z - bounds.north) < 0.001 && x >= bounds.west && x <= bounds.east) result.north.push({ start: x - half, end: x + half });
    else if (Math.abs(z - bounds.south) < 0.001 && x >= bounds.west && x <= bounds.east) result.south.push({ start: x - half, end: x + half });
    else if (Math.abs(x - bounds.west) < 0.001 && z >= bounds.north && z <= bounds.south) result.west.push({ start: z - half, end: z + half });
    else if (Math.abs(x - bounds.east) < 0.001 && z >= bounds.north && z <= bounds.south) result.east.push({ start: z - half, end: z + half });
  }
  return result;
}

function addRoomWalls(
  room: RoomDefinition,
  doors: readonly DoorDefinition[],
  parameters: ResolvedDungeonParameters,
  modules: ModuleDefinition[],
  colliders: ColliderDefinition[],
): void {
  const minX = room.x - parameters.width / 2;
  const maxX = room.x + room.width - parameters.width / 2;
  const minZ = room.z - parameters.height / 2;
  const maxZ = room.z + room.depth - parameters.height / 2;
  const openings = roomDoors(room, doors, parameters);
  const horizontalSides = [["north", minZ], ["south", maxZ]] as const;
  for (const [side, z] of horizontalSides) {
    let index = 0;
    for (const segment of subtractOpenings(minX, maxX, openings[side])) {
      addBox(modules, colliders, `${room.id}-${side}-wall-${index}`, "wall", [(segment.start + segment.end) / 2, WALL_HEIGHT / 2, z], [segment.end - segment.start, WALL_HEIGHT, WALL_THICKNESS]);
      index += 1;
    }
  }
  const verticalSides = [["west", minX], ["east", maxX]] as const;
  for (const [side, x] of verticalSides) {
    let index = 0;
    for (const segment of subtractOpenings(minZ, maxZ, openings[side])) {
      addBox(modules, colliders, `${room.id}-${side}-wall-${index}`, "wall", [x, WALL_HEIGHT / 2, (segment.start + segment.end) / 2], [WALL_THICKNESS, WALL_HEIGHT, segment.end - segment.start]);
      index += 1;
    }
  }
}

function addCorridor(
  corridor: CorridorDefinition,
  parameters: ResolvedDungeonParameters,
  modules: ModuleDefinition[],
  colliders: ColliderDefinition[],
): void {
  addBox(modules, colliders, `${corridor.id}-floor`, "floor", worldCenter(corridor.x, corridor.z, corridor.width, corridor.depth, parameters, -FLOOR_THICKNESS / 2), [corridor.width, FLOOR_THICKNESS, corridor.depth]);
  const minX = corridor.x - parameters.width / 2;
  const maxX = corridor.x + corridor.width - parameters.width / 2;
  const minZ = corridor.z - parameters.height / 2;
  const maxZ = corridor.z + corridor.depth - parameters.height / 2;
  if (corridor.width > corridor.depth) {
    addBox(modules, colliders, `${corridor.id}-wall-a`, "wall", [(minX + maxX) / 2, WALL_HEIGHT / 2, minZ], [corridor.width, WALL_HEIGHT, WALL_THICKNESS]);
    addBox(modules, colliders, `${corridor.id}-wall-b`, "wall", [(minX + maxX) / 2, WALL_HEIGHT / 2, maxZ], [corridor.width, WALL_HEIGHT, WALL_THICKNESS]);
  } else {
    addBox(modules, colliders, `${corridor.id}-wall-a`, "wall", [minX, WALL_HEIGHT / 2, (minZ + maxZ) / 2], [WALL_THICKNESS, WALL_HEIGHT, corridor.depth]);
    addBox(modules, colliders, `${corridor.id}-wall-b`, "wall", [maxX, WALL_HEIGHT / 2, (minZ + maxZ) / 2], [WALL_THICKNESS, WALL_HEIGHT, corridor.depth]);
  }
}

function addDoor(
  door: DoorDefinition,
  parameters: ResolvedDungeonParameters,
  modules: ModuleDefinition[],
  colliders: ColliderDefinition[],
): void {
  const size: Vec3 = [WALL_THICKNESS, WALL_HEIGHT, parameters.corridorWidth];
  modules.push({
    id: `module-${door.id}`,
    kind: door.open ? "door-open" : "door-closed",
    center: door.position,
    size,
    rotationY: door.rotationY + (door.open ? Math.PI / 2 : 0),
  });
  modules.push({
    id: `module-${door.id}-frame`,
    kind: "door-frame",
    center: [door.position[0], WALL_HEIGHT - FRAME_HEIGHT / 2, door.position[2]],
    size: [WALL_THICKNESS, FRAME_HEIGHT, parameters.corridorWidth + WALL_THICKNESS * 2],
    rotationY: door.rotationY,
  });
  colliders.push({
    id: `collider-${door.id}-frame`,
    kind: "wall",
    center: [door.position[0], WALL_HEIGHT - FRAME_HEIGHT / 2, door.position[2]],
    size: [WALL_THICKNESS, FRAME_HEIGHT, parameters.corridorWidth + WALL_THICKNESS * 2],
    rotationY: door.rotationY,
  });
  if (!door.open) {
    colliders.push({ id: `collider-${door.id}`, kind: "door", center: door.position, size, rotationY: door.rotationY });
  }
}

export function buildModules(placed: PlacedLayout, parameters: ResolvedDungeonParameters): BuiltModules {
  const modules: ModuleDefinition[] = [];
  const colliders: ColliderDefinition[] = [];
  for (const room of placed.rooms) {
    addBox(modules, colliders, `${room.id}-floor`, "floor", worldCenter(room.x, room.z, room.width, room.depth, parameters, -FLOOR_THICKNESS / 2), [room.width, FLOOR_THICKNESS, room.depth]);
    addRoomWalls(room, placed.doors, parameters, modules, colliders);
  }
  for (const corridor of placed.corridors) addCorridor(corridor, parameters, modules, colliders);
  for (const door of placed.doors) addDoor(door, parameters, modules, colliders);
  return { modules, colliders };
}
