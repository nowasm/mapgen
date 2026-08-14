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

const MODULE_SPAN = 2;
const FLOOR_THICKNESS = 0.2;
const WALL_HEIGHT = 3.2;
const WALL_THICKNESS = 0.2;
const ROUND_COLLIDER_SEGMENTS = 6;

interface Opening {
  readonly start: number;
  readonly end: number;
}

interface RoomBounds {
  readonly west: number;
  readonly east: number;
  readonly north: number;
  readonly south: number;
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

function roomBounds(room: RoomDefinition, parameters: ResolvedDungeonParameters): RoomBounds {
  return {
    west: room.x - parameters.width / 2,
    east: room.x + room.width - parameters.width / 2,
    north: room.z - parameters.height / 2,
    south: room.z + room.depth - parameters.height / 2,
  };
}

function addVisual(
  modules: ModuleDefinition[],
  id: string,
  kind: ModuleDefinition["kind"],
  center: Vec3,
  size: Vec3,
  assetKey: string,
  rotationY = 0,
): void {
  modules.push({ id: `module-${id}`, kind, center, size, rotationY, assetKey });
}

function addBox(
  modules: ModuleDefinition[],
  colliders: ColliderDefinition[],
  id: string,
  kind: "floor" | "wall",
  center: Vec3,
  size: Vec3,
  assetKey: string,
  rotationY = 0,
): void {
  addVisual(modules, id, kind, center, size, assetKey, rotationY);
  colliders.push({ id: `collider-${id}`, kind, center, size, ...(rotationY !== 0 ? { rotationY } : {}) });
}

function subtractOpenings(start: number, end: number, openings: readonly Opening[]): readonly Opening[] {
  const merged: Opening[] = [];
  for (const opening of [...openings].sort((a, b) => a.start - b.start)) {
    const clipped = { start: Math.max(start, opening.start), end: Math.min(end, opening.end) };
    if (clipped.end <= clipped.start) continue;
    const previous = merged[merged.length - 1];
    if (previous && clipped.start <= previous.end) {
      merged[merged.length - 1] = { start: previous.start, end: Math.max(previous.end, clipped.end) };
    } else merged.push(clipped);
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
  const bounds = roomBounds(room, parameters);
  const result = { north: [] as Opening[], south: [] as Opening[], west: [] as Opening[], east: [] as Opening[] };
  const half = MODULE_SPAN / 2;
  for (const door of doors.filter(({ roomId }) => roomId === room.id)) {
    const [x, , z] = door.position;
    if (Math.abs(z - bounds.north) < 0.001) result.north.push({ start: x - half, end: x + half });
    else if (Math.abs(z - bounds.south) < 0.001) result.south.push({ start: x - half, end: x + half });
    else if (Math.abs(x - bounds.west) < 0.001) result.west.push({ start: z - half, end: z + half });
    else if (Math.abs(x - bounds.east) < 0.001) result.east.push({ start: z - half, end: z + half });
  }
  return result;
}

function addStraightRoomWalls(
  room: RoomDefinition,
  doors: readonly DoorDefinition[],
  parameters: ResolvedDungeonParameters,
  modules: ModuleDefinition[],
  colliders: ColliderDefinition[],
): void {
  const bounds = roomBounds(room, parameters);
  const openings = roomDoors(room, doors, parameters);
  const inset = MODULE_SPAN;
  for (const [side, z] of [["north", bounds.north], ["south", bounds.south]] as const) {
    for (const [index, segment] of subtractOpenings(bounds.west + inset, bounds.east - inset, openings[side]).entries()) {
      addBox(modules, colliders, `${room.id}-${side}-wall-${index}`, "wall", [(segment.start + segment.end) / 2, WALL_HEIGHT / 2, z], [segment.end - segment.start, WALL_HEIGHT, WALL_THICKNESS], "wall");
    }
  }
  for (const [side, x] of [["west", bounds.west], ["east", bounds.east]] as const) {
    for (const [index, segment] of subtractOpenings(bounds.north + inset, bounds.south - inset, openings[side]).entries()) {
      addBox(modules, colliders, `${room.id}-${side}-wall-${index}`, "wall", [x, WALL_HEIGHT / 2, (segment.start + segment.end) / 2], [WALL_THICKNESS, WALL_HEIGHT, segment.end - segment.start], "wall");
    }
  }
}

const cornerRotations = {
  northWest: Math.PI,
  northEast: Math.PI / 2,
  southEast: 0,
  southWest: -Math.PI / 2,
} as const;

function addSquareCornerColliders(
  colliders: ColliderDefinition[],
  roomId: string,
  name: string,
  outerX: number,
  outerZ: number,
  inwardX: 1 | -1,
  inwardZ: 1 | -1,
): void {
  const half = MODULE_SPAN / 2;
  colliders.push(
    { id: `collider-${roomId}-${name}-x`, kind: "wall", center: [outerX + inwardX * half, WALL_HEIGHT / 2, outerZ], size: [MODULE_SPAN, WALL_HEIGHT, WALL_THICKNESS] },
    { id: `collider-${roomId}-${name}-z`, kind: "wall", center: [outerX, WALL_HEIGHT / 2, outerZ + inwardZ * half], size: [WALL_THICKNESS, WALL_HEIGHT, MODULE_SPAN] },
  );
}

function addRoundedCornerColliders(
  colliders: ColliderDefinition[],
  roomId: string,
  name: string,
  arcCenterX: number,
  arcCenterZ: number,
  startAngle: number,
): void {
  for (let index = 0; index < ROUND_COLLIDER_SEGMENTS; index += 1) {
    const a = startAngle + index / ROUND_COLLIDER_SEGMENTS * Math.PI / 2;
    const b = startAngle + (index + 1) / ROUND_COLLIDER_SEGMENTS * Math.PI / 2;
    const ax = arcCenterX + Math.cos(a) * MODULE_SPAN;
    const az = arcCenterZ + Math.sin(a) * MODULE_SPAN;
    const bx = arcCenterX + Math.cos(b) * MODULE_SPAN;
    const bz = arcCenterZ + Math.sin(b) * MODULE_SPAN;
    colliders.push({
      id: `collider-${roomId}-${name}-arc-${index}`,
      kind: "wall",
      center: [(ax + bx) / 2, WALL_HEIGHT / 2, (az + bz) / 2],
      size: [WALL_THICKNESS, WALL_HEIGHT, Math.hypot(bx - ax, bz - az) + 0.03],
      rotationY: Math.atan2(bx - ax, bz - az),
    });
  }
}

function addDiagonalCornerCollider(
  colliders: ColliderDefinition[],
  roomId: string,
  name: string,
  arcCenterX: number,
  arcCenterZ: number,
  startAngle: number,
): void {
  const endAngle = startAngle + Math.PI / 2;
  const ax = arcCenterX + Math.cos(startAngle) * MODULE_SPAN;
  const az = arcCenterZ + Math.sin(startAngle) * MODULE_SPAN;
  const bx = arcCenterX + Math.cos(endAngle) * MODULE_SPAN;
  const bz = arcCenterZ + Math.sin(endAngle) * MODULE_SPAN;
  colliders.push({
    id: `collider-${roomId}-${name}-diagonal`,
    kind: "wall",
    center: [(ax + bx) / 2, WALL_HEIGHT / 2, (az + bz) / 2],
    size: [WALL_THICKNESS, WALL_HEIGHT, Math.hypot(bx - ax, bz - az)],
    rotationY: Math.atan2(bx - ax, bz - az),
  });
}

function addRoomCorners(
  room: RoomDefinition,
  parameters: ResolvedDungeonParameters,
  modules: ModuleDefinition[],
  colliders: ColliderDefinition[],
): void {
  const b = roomBounds(room, parameters);
  const half = MODULE_SPAN / 2;
  const corners = [
    { name: "north-west", key: "northWest" as const, center: [b.west + half, b.north + half] as const, outer: [b.west, b.north] as const, inward: [1, 1] as const, arc: [b.west + MODULE_SPAN, b.north + MODULE_SPAN, Math.PI] as const },
    { name: "north-east", key: "northEast" as const, center: [b.east - half, b.north + half] as const, outer: [b.east, b.north] as const, inward: [-1, 1] as const, arc: [b.east - MODULE_SPAN, b.north + MODULE_SPAN, Math.PI * 1.5] as const },
    { name: "south-east", key: "southEast" as const, center: [b.east - half, b.south - half] as const, outer: [b.east, b.south] as const, inward: [-1, -1] as const, arc: [b.east - MODULE_SPAN, b.south - MODULE_SPAN, 0] as const },
    { name: "south-west", key: "southWest" as const, center: [b.west + half, b.south - half] as const, outer: [b.west, b.south] as const, inward: [1, -1] as const, arc: [b.west + MODULE_SPAN, b.south - MODULE_SPAN, Math.PI / 2] as const },
  ];
  const cornerAssetKey = `wall-corner-${parameters.roomCornerStyle}`;
  for (const corner of corners) {
    addVisual(modules, `${room.id}-${corner.name}-corner`, "wall", [corner.center[0], WALL_HEIGHT / 2, corner.center[1]], [MODULE_SPAN, WALL_HEIGHT, MODULE_SPAN], cornerAssetKey, cornerRotations[corner.key]);
    if (parameters.roomCornerStyle === "round") {
      addRoundedCornerColliders(colliders, room.id, corner.name, corner.arc[0], corner.arc[1], corner.arc[2]);
    } else if (parameters.roomCornerStyle === "diagonal") {
      addDiagonalCornerCollider(colliders, room.id, corner.name, corner.arc[0], corner.arc[1], corner.arc[2]);
    } else {
      addSquareCornerColliders(colliders, room.id, corner.name, corner.outer[0], corner.outer[1], corner.inward[0], corner.inward[1]);
    }
  }
}

function addRoomFloor(
  room: RoomDefinition,
  parameters: ResolvedDungeonParameters,
  modules: ModuleDefinition[],
  colliders: ColliderDefinition[],
): void {
  const center = worldCenter(room.x, room.z, room.width, room.depth, parameters, -FLOOR_THICKNESS / 2);
  colliders.push({ id: `collider-${room.id}-floor`, kind: "floor", center, size: [room.width, FLOOR_THICKNESS, room.depth] });
  if (parameters.roomCornerStyle === "column") {
    addVisual(modules, `${room.id}-floor`, "floor", center, [room.width, FLOOR_THICKNESS, room.depth], "floor");
    return;
  }

  const middleWidth = room.width - MODULE_SPAN * 2;
  const middleDepth = room.depth - MODULE_SPAN * 2;
  addVisual(modules, `${room.id}-floor-center`, "floor", center, [middleWidth, FLOOR_THICKNESS, room.depth], "floor");
  for (const [side, x] of [["west", center[0] - room.width / 2 + MODULE_SPAN / 2], ["east", center[0] + room.width / 2 - MODULE_SPAN / 2]] as const) {
    addVisual(modules, `${room.id}-floor-${side}`, "floor", [x, center[1], center[2]], [MODULE_SPAN, FLOOR_THICKNESS, middleDepth], "floor");
  }
  const cornerCenters = [
    ["north-west", center[0] - room.width / 2 + 1, center[2] - room.depth / 2 + 1, cornerRotations.northWest],
    ["north-east", center[0] + room.width / 2 - 1, center[2] - room.depth / 2 + 1, cornerRotations.northEast],
    ["south-east", center[0] + room.width / 2 - 1, center[2] + room.depth / 2 - 1, cornerRotations.southEast],
    ["south-west", center[0] - room.width / 2 + 1, center[2] + room.depth / 2 - 1, cornerRotations.southWest],
  ] as const;
  const floorCornerAssetKey = `floor-corner-${parameters.roomCornerStyle}`;
  for (const [name, x, z, rotation] of cornerCenters) {
    addVisual(modules, `${room.id}-floor-${name}`, "floor", [x, center[1], z], [MODULE_SPAN, FLOOR_THICKNESS, MODULE_SPAN], floorCornerAssetKey, rotation);
  }
}

function addCorridor(
  corridor: CorridorDefinition,
  parameters: ResolvedDungeonParameters,
  modules: ModuleDefinition[],
  colliders: ColliderDefinition[],
): void {
  addBox(modules, colliders, `${corridor.id}-floor`, "floor", worldCenter(corridor.x, corridor.z, corridor.width, corridor.depth, parameters, -FLOOR_THICKNESS / 2), [corridor.width, FLOOR_THICKNESS, corridor.depth], "floor");
  const minX = corridor.x - parameters.width / 2;
  const maxX = corridor.x + corridor.width - parameters.width / 2;
  const minZ = corridor.z - parameters.height / 2;
  const maxZ = corridor.z + corridor.depth - parameters.height / 2;
  const orientation = corridor.orientation ?? (corridor.width > corridor.depth ? "horizontal" : "vertical");
  if (orientation === "horizontal") {
    addBox(modules, colliders, `${corridor.id}-wall-a`, "wall", [(minX + maxX) / 2, WALL_HEIGHT / 2, minZ], [corridor.width, WALL_HEIGHT, WALL_THICKNESS], "wall");
    addBox(modules, colliders, `${corridor.id}-wall-b`, "wall", [(minX + maxX) / 2, WALL_HEIGHT / 2, maxZ], [corridor.width, WALL_HEIGHT, WALL_THICKNESS], "wall");
  } else {
    addBox(modules, colliders, `${corridor.id}-wall-a`, "wall", [minX, WALL_HEIGHT / 2, (minZ + maxZ) / 2], [WALL_THICKNESS, WALL_HEIGHT, corridor.depth], "wall");
    addBox(modules, colliders, `${corridor.id}-wall-b`, "wall", [maxX, WALL_HEIGHT / 2, (minZ + maxZ) / 2], [WALL_THICKNESS, WALL_HEIGHT, corridor.depth], "wall");
  }
}

function addDoor(
  door: DoorDefinition,
  room: RoomDefinition | undefined,
  parameters: ResolvedDungeonParameters,
  modules: ModuleDefinition[],
  colliders: ColliderDefinition[],
): void {
  const roundDoor = parameters.roomCornerStyle !== "column";
  const doorStyle = roundDoor ? "round" : "square";
  const frameWidth = MODULE_SPAN;
  const frameHeight = 2.4;
  const clearWidth = 0.925;
  const clearHeight = 2.1;
  const doorThickness = 0.25;
  const jambWidth = 0.55;
  const frameKey = `frame-${doorStyle}`;
  addVisual(modules, `${door.id}-frame`, "door-frame", [door.position[0], frameHeight / 2, door.position[2]], [0.2, frameHeight, frameWidth], frameKey, door.rotationY);

  const widthAxisX = Math.sin(door.rotationY);
  const widthAxisZ = Math.cos(door.rotationY);
  const roomCenterX = room ? room.x + room.width / 2 - parameters.width / 2 : door.position[0] + Math.cos(door.rotationY);
  const roomCenterZ = room ? room.z + room.depth / 2 - parameters.height / 2 : door.position[2] - Math.sin(door.rotationY);
  const roomDeltaX = roomCenterX - door.position[0];
  const roomDeltaZ = roomCenterZ - door.position[2];
  const roomDistance = Math.hypot(roomDeltaX, roomDeltaZ) || 1;
  const inwardX = roomDeltaX / roomDistance;
  const inwardZ = roomDeltaZ / roomDistance;
  const leafWidth = clearWidth;
  const hingeOffset = -clearWidth / 2;
  const center: Vec3 = door.open
    ? [door.position[0] + widthAxisX * hingeOffset + inwardX * leafWidth / 2, clearHeight / 2, door.position[2] + widthAxisZ * hingeOffset + inwardZ * leafWidth / 2]
    : [door.position[0], clearHeight / 2, door.position[2]];
  const rotationY = door.open ? Math.atan2(inwardX, inwardZ) : door.rotationY;
  addVisual(modules, `${door.id}-leaf`, door.open ? "door-open" : "door-closed", center, [doorThickness, clearHeight, leafWidth], `door-${doorStyle}-c`, rotationY);

  const framePieces = [
    { name: "lintel", center: [door.position[0], clearHeight + (frameHeight - clearHeight) / 2, door.position[2]] as Vec3, size: [0.2, frameHeight - clearHeight, clearWidth] as Vec3 },
    ...([-1, 1] as const).map((direction, index) => ({
      name: `jamb-${index === 0 ? "a" : "b"}`,
      center: [door.position[0] + widthAxisX * direction * (frameWidth / 2 - jambWidth / 2), frameHeight / 2, door.position[2] + widthAxisZ * direction * (frameWidth / 2 - jambWidth / 2)] as Vec3,
      size: [0.2, frameHeight, jambWidth] as Vec3,
    })),
  ];
  for (const frame of framePieces) colliders.push({ id: `collider-${door.id}-frame-${frame.name}`, kind: "wall", center: frame.center, size: frame.size, rotationY: door.rotationY });
  const headerHeight = Number((WALL_HEIGHT - frameHeight).toFixed(6));
  addBox(modules, colliders, `${door.id}-wall-header`, "wall", [door.position[0], frameHeight + headerHeight / 2, door.position[2]], [WALL_THICKNESS, headerHeight, frameWidth], "wall", door.rotationY);
  if (!door.open) colliders.push({ id: `collider-${door.id}`, kind: "door", center: [door.position[0], clearHeight / 2, door.position[2]], size: [doorThickness, clearHeight, clearWidth], rotationY: door.rotationY });
}

export function buildModules(placed: PlacedLayout, parameters: ResolvedDungeonParameters): BuiltModules {
  const modules: ModuleDefinition[] = [];
  const colliders: ColliderDefinition[] = [];
  for (const room of placed.rooms) {
    addRoomFloor(room, parameters, modules, colliders);
    addStraightRoomWalls(room, placed.doors, parameters, modules, colliders);
    addRoomCorners(room, parameters, modules, colliders);
  }
  for (const corridor of placed.corridors) addCorridor(corridor, parameters, modules, colliders);
  const roomById = new Map(placed.rooms.map((room) => [room.id, room]));
  for (const door of placed.doors) addDoor(door, door.roomId ? roomById.get(door.roomId) : undefined, parameters, modules, colliders);
  return { modules, colliders };
}
