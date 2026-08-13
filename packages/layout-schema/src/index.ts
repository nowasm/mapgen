import layoutSchema from "./layout.schema.json";

export const DUNGEON_LAYOUT_SCHEMA_VERSION = 1 as const;
export const dungeonLayoutJsonSchema = layoutSchema;

export type Vec3 = readonly [number, number, number];
export type ColliderKind = "floor" | "wall" | "door";
export type ModuleKind = "floor" | "wall" | "door-frame" | "door-open" | "door-closed";

export interface MinimumDungeonParameters {
  readonly width: number;
  readonly height: number;
  readonly corridorWidth: number;
  readonly doorOpenRate: number;
}

export interface GridDefinition {
  readonly width: number;
  readonly height: number;
  readonly cellSize: number;
}

export interface RoomDefinition {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  readonly width: number;
  readonly depth: number;
  readonly kind: "entrance" | "exit" | "normal";
}

export interface CorridorDefinition {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  readonly width: number;
  readonly depth: number;
}

export interface ConnectionDefinition {
  readonly id: string;
  readonly fromRoomId: string;
  readonly toRoomId: string;
  readonly corridorId: string;
  readonly doorIds: readonly string[];
}

export interface DoorDefinition {
  readonly id: string;
  readonly position: Vec3;
  readonly rotationY: number;
  readonly open: boolean;
}

export interface ModuleDefinition {
  readonly id: string;
  readonly kind: ModuleKind;
  readonly center: Vec3;
  readonly size: Vec3;
  readonly rotationY: number;
}

export interface ColliderDefinition {
  readonly id: string;
  readonly kind: ColliderKind;
  readonly center: Vec3;
  readonly size: Vec3;
  readonly rotationY?: number;
}

export interface DungeonLayout {
  readonly schemaVersion: typeof DUNGEON_LAYOUT_SCHEMA_VERSION;
  readonly generatorVersion: string;
  readonly exportId: string;
  readonly glbSha256?: string;
  readonly seed: number;
  readonly parameters: MinimumDungeonParameters;
  readonly grid: GridDefinition;
  readonly coordinateSystem: {
    readonly up: "Y";
    readonly forward: "-Z";
    readonly handedness: "right";
  };
  readonly assetPack: { readonly id: string; readonly version: string };
  readonly rooms: readonly RoomDefinition[];
  readonly connections: readonly ConnectionDefinition[];
  readonly corridors: readonly CorridorDefinition[];
  readonly doors: readonly DoorDefinition[];
  readonly spawn: { readonly position: Vec3; readonly rotationY: number };
  readonly modules: readonly ModuleDefinition[];
  readonly colliders: readonly ColliderDefinition[];
  readonly diagnostics: { readonly warnings: readonly string[] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isIntegerWithin(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 256;
}

function isVec3(value: unknown, requirePositive = false): value is Vec3 {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((entry) => isFiniteNumber(entry) && (!requirePositive || entry > 0))
  );
}

function hasFiniteRect(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.z) &&
    isFiniteNumber(value.width) &&
    value.width > 0 &&
    isFiniteNumber(value.depth) &&
    value.depth > 0
  );
}

function validateLayout(value: unknown): string | null {
  if (!isRecord(value)) return "layout must be an object";
  if (value.schemaVersion !== DUNGEON_LAYOUT_SCHEMA_VERSION) {
    return `schemaVersion must equal ${DUNGEON_LAYOUT_SCHEMA_VERSION}`;
  }
  if (!isNonEmptyString(value.generatorVersion)) return "generatorVersion must be a non-empty string";
  if (!isNonEmptyString(value.exportId)) return "exportId must be a non-empty string";
  if (value.glbSha256 !== undefined && !isNonEmptyString(value.glbSha256)) {
    return "glbSha256 must be a non-empty string when present";
  }
  if (!isIntegerWithin(value.seed, 0, 0xffff_ffff)) return "seed must be a uint32";

  if (!isRecord(value.parameters)) return "parameters must be an object";
  const { width, height, corridorWidth, doorOpenRate } = value.parameters;
  if (!isIntegerWithin(width, 16, 512) || !isIntegerWithin(height, 16, 512)) {
    return "parameters width and height must be integers from 16 to 512";
  }
  if (!isIntegerWithin(corridorWidth, 2, 8)) return "corridorWidth must be an integer from 2 to 8";
  if (!isFiniteNumber(doorOpenRate) || doorOpenRate < 0 || doorOpenRate > 1) {
    return "doorOpenRate must be from 0 to 1";
  }

  if (!isRecord(value.grid)) return "grid must be an object";
  if (
    !isIntegerWithin(value.grid.width, 16, 512) ||
    !isIntegerWithin(value.grid.height, 16, 512) ||
    !isFiniteNumber(value.grid.cellSize) ||
    value.grid.cellSize <= 0
  ) {
    return "grid dimensions and cellSize are invalid";
  }

  if (
    !isRecord(value.coordinateSystem) ||
    value.coordinateSystem.up !== "Y" ||
    value.coordinateSystem.forward !== "-Z" ||
    value.coordinateSystem.handedness !== "right"
  ) {
    return "coordinateSystem must be right-handed Y-up with -Z forward";
  }
  if (
    !isRecord(value.assetPack) ||
    !isNonEmptyString(value.assetPack.id) ||
    !isNonEmptyString(value.assetPack.version)
  ) {
    return "assetPack is invalid";
  }

  if (!Array.isArray(value.rooms) || !value.rooms.every((room) => {
    if (!hasFiniteRect(room) || !isRecord(room)) return false;
    return room.kind === "entrance" || room.kind === "exit" || room.kind === "normal";
  })) return "rooms are invalid";

  if (!Array.isArray(value.corridors) || !value.corridors.every(hasFiniteRect)) {
    return "corridors are invalid";
  }

  if (!Array.isArray(value.connections) || !value.connections.every((connection) => (
    isRecord(connection) &&
    isNonEmptyString(connection.id) &&
    isNonEmptyString(connection.fromRoomId) &&
    isNonEmptyString(connection.toRoomId) &&
    isNonEmptyString(connection.corridorId) &&
    Array.isArray(connection.doorIds) &&
    connection.doorIds.every(isNonEmptyString)
  ))) return "connections are invalid";

  if (!Array.isArray(value.doors) || !value.doors.every((door) => (
    isRecord(door) &&
    isNonEmptyString(door.id) &&
    isVec3(door.position) &&
    isFiniteNumber(door.rotationY) &&
    typeof door.open === "boolean"
  ))) return "doors are invalid";

  if (
    !isRecord(value.spawn) ||
    !isVec3(value.spawn.position) ||
    !isFiniteNumber(value.spawn.rotationY)
  ) return "spawn is invalid";

  const moduleKinds: readonly unknown[] = ["floor", "wall", "door-frame", "door-open", "door-closed"];
  if (!Array.isArray(value.modules) || !value.modules.every((module) => (
    isRecord(module) &&
    isNonEmptyString(module.id) &&
    moduleKinds.includes(module.kind) &&
    isVec3(module.center) &&
    isVec3(module.size, true) &&
    isFiniteNumber(module.rotationY)
  ))) return "modules are invalid";

  const colliderKinds: readonly unknown[] = ["floor", "wall", "door"];
  if (!Array.isArray(value.colliders) || !value.colliders.every((collider) => (
    isRecord(collider) &&
    isNonEmptyString(collider.id) &&
    colliderKinds.includes(collider.kind) &&
    isVec3(collider.center) &&
    isVec3(collider.size, true) &&
    (collider.rotationY === undefined || isFiniteNumber(collider.rotationY))
  ))) return "colliders are invalid";

  if (
    !isRecord(value.diagnostics) ||
    !Array.isArray(value.diagnostics.warnings) ||
    !value.diagnostics.warnings.every((warning) => typeof warning === "string")
  ) return "diagnostics are invalid";

  return null;
}

export function isDungeonLayout(value: unknown): value is DungeonLayout {
  return validateLayout(value) === null;
}

export function assertDungeonLayout(value: unknown): DungeonLayout {
  const issue = validateLayout(value);
  if (issue !== null) throw new TypeError(`Invalid DungeonLayout: ${issue}`);
  return value as DungeonLayout;
}
