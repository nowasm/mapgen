import layoutSchema from "./layout.schema.json";

export const DUNGEON_LAYOUT_SCHEMA_VERSION = 1 as const;
export const dungeonLayoutJsonSchema = layoutSchema;

export type Vec3 = readonly [number, number, number];
export type ColliderKind = "floor" | "wall" | "door";
export type ModuleKind = "floor" | "wall" | "door-frame" | "door-open" | "door-closed";
export type NumericRange = readonly [number, number];
export type ConcreteLayoutMode = "hub" | "ring" | "branch";
export type LayoutMode = "random" | ConcreteLayoutMode;

export interface MinimumDungeonParameters {
  readonly width: number;
  readonly height: number;
  readonly corridorWidth: number;
  readonly doorOpenRate: number;
}

export interface DungeonParameters {
  readonly width: number;
  readonly height: number;
  readonly mode: LayoutMode;
  readonly layoutWeights: Readonly<Record<ConcreteLayoutMode, number>>;
  readonly largeCellSize: NumericRange;
  readonly roomRate: NumericRange;
  readonly roomSize: NumericRange;
  readonly roomMinSize: NumericRange;
  readonly roomMaxSize: NumericRange;
  readonly roomCountMin: NumericRange;
  readonly roomCountMax: NumericRange;
  readonly corridorWidth: NumericRange;
  readonly loopRate: NumericRange;
  readonly deadEndRate: NumericRange;
  readonly branchTryMultiplier: NumericRange;
  readonly branchFromProtectedChance: NumericRange;
  readonly linearWingChance: NumericRange;
  readonly mirrorXChance: NumericRange;
  readonly doorOpenRate: NumericRange;
}

export interface ResolvedDungeonParameters {
  readonly width: number;
  readonly height: number;
  readonly topology: ConcreteLayoutMode;
  readonly largeCellSize: number;
  readonly roomRate: number;
  readonly roomSize: number;
  readonly roomMinSize: number;
  readonly roomMaxSize: number;
  readonly roomCountMin: number;
  readonly roomCountMax: number;
  readonly roomCount: number;
  readonly corridorWidth: number;
  readonly loopRate: number;
  readonly deadEndRate: number;
  readonly branchTryMultiplier: number;
  readonly branchFromProtectedChance: number;
  readonly linearWingChance: number;
  readonly mirrorXChance: number;
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
  readonly parameters: MinimumDungeonParameters | DungeonParameters;
  readonly resolvedParameters?: ResolvedDungeonParameters;
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
  readonly diagnostics: {
    readonly warnings: readonly string[];
    readonly topology?: {
      readonly mode: ConcreteLayoutMode;
      readonly roomCount: number;
      readonly edgeCount: number;
      readonly loopCount: number;
      readonly deadEndCount: number;
      readonly attempts: number;
    };
  };
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

function isNumberWithin(value: unknown, minimum: number, maximum: number): value is number {
  return isFiniteNumber(value) && value >= minimum && value <= maximum;
}

function isNumericRange(
  value: unknown,
  minimum: number,
  maximum: number,
  requireInteger = false,
): value is NumericRange {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((entry) => (
      requireInteger
        ? isIntegerWithin(entry, minimum, maximum)
        : isNumberWithin(entry, minimum, maximum)
    )) &&
    Number(value[0]) <= Number(value[1])
  );
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

const concreteLayoutModes: readonly ConcreteLayoutMode[] = ["hub", "ring", "branch"];

function validateMinimumParameters(parameters: Record<string, unknown>): string | null {
  const { width, height, corridorWidth, doorOpenRate } = parameters;
  if (!isIntegerWithin(width, 16, 512) || !isIntegerWithin(height, 16, 512)) {
    return "parameters width and height must be integers from 16 to 512";
  }
  if (!isIntegerWithin(corridorWidth, 2, 8)) return "corridorWidth must be an integer from 2 to 8";
  if (!isNumberWithin(doorOpenRate, 0, 1)) return "doorOpenRate must be from 0 to 1";
  return null;
}

function validateDungeonParameters(parameters: Record<string, unknown>): string | null {
  if (!isIntegerWithin(parameters.width, 16, 512) || !isIntegerWithin(parameters.height, 16, 512)) {
    return "parameters width and height must be integers from 16 to 512";
  }
  if (parameters.mode !== "random" && !concreteLayoutModes.includes(parameters.mode as ConcreteLayoutMode)) {
    return "mode must be random, hub, ring, or branch";
  }
  if (!isRecord(parameters.layoutWeights)) return "layoutWeights must be an object";
  const layoutWeights = parameters.layoutWeights;
  const weights = concreteLayoutModes.map((mode) => layoutWeights[mode]);
  if (!weights.every((weight) => isNumberWithin(weight, 0, 1)) || weights.reduce<number>((sum, weight) => sum + Number(weight), 0) <= 0) {
    return "layoutWeights must contain non-negative hub, ring, and branch weights";
  }

  const ranges: readonly [string, number, number, boolean][] = [
    ["largeCellSize", 10, 50, true],
    ["roomRate", 0, 1, false],
    ["roomSize", 0.5, 1.5, false],
    ["roomMinSize", 6, 20, true],
    ["roomMaxSize", 18, 48, true],
    ["roomCountMin", 4, 12, true],
    ["roomCountMax", 10, 40, true],
    ["corridorWidth", 2, 8, true],
    ["loopRate", 0, 1, false],
    ["deadEndRate", 0, 1, false],
    ["branchTryMultiplier", 0, 20, true],
    ["branchFromProtectedChance", 0, 1, false],
    ["linearWingChance", 0, 1, false],
    ["mirrorXChance", 0, 1, false],
    ["doorOpenRate", 0, 1, false],
  ];
  for (const [name, minimum, maximum, integer] of ranges) {
    if (!isNumericRange(parameters[name], minimum, maximum, integer)) {
      return `${name} must be an ordered range from ${minimum} to ${maximum}`;
    }
  }
  return null;
}

function validateResolvedParameters(value: unknown): string | null {
  if (!isRecord(value)) return "resolvedParameters must be an object";
  if (!isIntegerWithin(value.width, 16, 512) || !isIntegerWithin(value.height, 16, 512)) {
    return "resolvedParameters dimensions are invalid";
  }
  if (!concreteLayoutModes.includes(value.topology as ConcreteLayoutMode)) {
    return "resolvedParameters topology is invalid";
  }
  const integers: readonly [string, number, number][] = [
    ["largeCellSize", 10, 50],
    ["roomMinSize", 6, 20],
    ["roomMaxSize", 18, 48],
    ["roomCountMin", 4, 12],
    ["roomCountMax", 10, 40],
    ["roomCount", 4, 40],
    ["corridorWidth", 2, 8],
    ["branchTryMultiplier", 0, 20],
  ];
  if (integers.some(([name, minimum, maximum]) => !isIntegerWithin(value[name], minimum, maximum))) {
    return "resolvedParameters integer value is invalid";
  }
  const rates = ["roomRate", "loopRate", "deadEndRate", "branchFromProtectedChance", "linearWingChance", "mirrorXChance", "doorOpenRate"] as const;
  if (rates.some((name) => !isNumberWithin(value[name], 0, 1)) || !isNumberWithin(value.roomSize, 0.5, 1.5)) {
    return "resolvedParameters rate or roomSize is invalid";
  }
  if (Number(value.roomMinSize) > Number(value.roomMaxSize) || Number(value.roomCountMin) > Number(value.roomCountMax)) {
    return "resolvedParameters minimum exceeds maximum";
  }
  return null;
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
  const parameterIssue = value.parameters.mode === undefined
    ? validateMinimumParameters(value.parameters)
    : validateDungeonParameters(value.parameters);
  if (parameterIssue !== null) return parameterIssue;
  if (value.resolvedParameters !== undefined) {
    const resolvedIssue = validateResolvedParameters(value.resolvedParameters);
    if (resolvedIssue !== null) return resolvedIssue;
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
  if (value.diagnostics.topology !== undefined) {
    const topology = value.diagnostics.topology;
    if (
      !isRecord(topology) ||
      !concreteLayoutModes.includes(topology.mode as ConcreteLayoutMode) ||
      !isIntegerWithin(topology.roomCount, 0, 40) ||
      !isIntegerWithin(topology.edgeCount, 0, 160) ||
      !isIntegerWithin(topology.loopCount, 0, 160) ||
      !isIntegerWithin(topology.deadEndCount, 0, 40) ||
      !isIntegerWithin(topology.attempts, 0, 100_000)
    ) return "diagnostics topology is invalid";
  }

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
