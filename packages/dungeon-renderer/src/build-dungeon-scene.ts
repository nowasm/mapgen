import type { DungeonAppearance, DungeonLayout, ModuleDefinition, ModuleKind } from "@mapgen/layout-schema";
import {
  type BufferGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Material,
  type Texture,
} from "three";

import { kenneyVisualPack } from "./kenney-visual-pack";
import { createFittedGeometry, createTiledFloorGeometry, createTiledWallGeometry, createWorldAlignedUvGeometry } from "./modular-geometry";

export interface DungeonTextureSet {
  readonly floor?: Texture;
  readonly wall?: Texture;
  readonly doorFrame?: Texture;
}

export interface DungeonSceneBuildOptions {
  readonly appearance?: DungeonAppearance;
  readonly textures?: DungeonTextureSet;
}

export interface DungeonSceneResult {
  readonly root: Group;
  readonly counts: { readonly floors: number; readonly walls: number; readonly shells: number; readonly doors: number };
}

function createMaterials(textures: DungeonTextureSet): Record<ModuleKind, Material> {
  return {
    floor: new MeshStandardMaterial({ color: new Color("#ffffff"), map: textures.floor ?? null, vertexColors: !textures.floor, roughness: 0.93, metalness: 0.02 }),
    wall: new MeshStandardMaterial({ color: new Color("#ffffff"), map: textures.wall ?? null, vertexColors: !textures.wall, roughness: 0.88, metalness: 0.01 }),
    "room-shell": new MeshStandardMaterial({ color: new Color("#ffffff"), vertexColors: true, roughness: 0.9, metalness: 0.01 }),
    "corridor-shell": new MeshStandardMaterial({ color: new Color("#ffffff"), vertexColors: true, roughness: 0.9, metalness: 0.01 }),
    "door-frame": new MeshStandardMaterial({ color: new Color("#ffffff"), map: textures.doorFrame ?? null, vertexColors: !textures.doorFrame, roughness: 0.82, metalness: 0.03 }),
    "door-open": new MeshStandardMaterial({ color: new Color("#ffffff"), vertexColors: true, roughness: 0.72, metalness: 0.05 }),
    "door-closed": new MeshStandardMaterial({ color: new Color("#ffffff"), vertexColors: true, roughness: 0.76, metalness: 0.08 }),
  };
}

const geometryBySignature = new Map<string, BufferGeometry>();

const modelByAssetKey = {
  floor: kenneyVisualPack.modules.floor,
  "floor-half": kenneyVisualPack.modules.floorHalf,
  "floor-quarter": kenneyVisualPack.modules.floorQuarter,
  "floor-corner-diagonal": kenneyVisualPack.modules.floorCornerDiagonal,
  "floor-corner-round": kenneyVisualPack.modules.floorCornerRound,
  wall: kenneyVisualPack.modules.wall,
  "wall-half": kenneyVisualPack.modules.wallHalf,
  "wall-corner": kenneyVisualPack.modules.wallCorner,
  "wall-corner-column": kenneyVisualPack.modules.wallCornerColumn,
  "wall-corner-diagonal": kenneyVisualPack.modules.wallCornerDiagonal,
  "wall-corner-round": kenneyVisualPack.modules.wallCornerRound,
  "frame-square": kenneyVisualPack.modules.frameSquare,
  "frame-round": kenneyVisualPack.modules.frameRound,
  "frame-wide-square": kenneyVisualPack.modules.frameWideSquare,
  "frame-wide-round": kenneyVisualPack.modules.frameWideRound,
  "door-square-a": kenneyVisualPack.modules.doorSquareA,
  "door-square-b": kenneyVisualPack.modules.doorSquareB,
  "door-square-c": kenneyVisualPack.modules.doorSquareC,
  "door-square-d": kenneyVisualPack.modules.doorSquareD,
  "door-round-a": kenneyVisualPack.modules.doorRoundA,
  "door-round-b": kenneyVisualPack.modules.doorRoundB,
  "door-round-c": kenneyVisualPack.modules.doorRoundC,
  "door-round-d": kenneyVisualPack.modules.doorRoundD,
  column: kenneyVisualPack.modules.column,
  "column-thin": kenneyVisualPack.modules.columnThin,
} as const;

function modelForModule(module: ModuleDefinition) {
  const fallback = module.kind === "floor" ? "floor"
    : module.kind === "wall" ? "wall"
      : module.kind === "door-frame" ? "frame-square"
        : "door-square-a";
  const key = (module.assetKey ?? fallback) as keyof typeof modelByAssetKey;
  return modelByAssetKey[key] ?? modelByAssetKey[fallback];
}

function moduleGeometry(module: ModuleDefinition): BufferGeometry {
  const signature = `${module.kind}:${module.assetKey ?? "default"}:${module.size.join("x")}:${JSON.stringify(module.openings ?? [])}`;
  const cached = geometryBySignature.get(signature);
  if (cached) return cached;
  const model = modelForModule(module);
  const geometry = module.kind === "floor"
    ? module.assetKey === "floor-corner-round" || module.assetKey === "floor-corner-diagonal"
      ? createFittedGeometry(module.size, model)
      : createTiledFloorGeometry(module.size, model, 2)
    : module.kind === "wall"
      ? module.assetKey === "wall-corner" || module.assetKey === "wall-corner-column" || module.assetKey === "wall-corner-diagonal" || module.assetKey === "wall-corner-round" || module.assetKey === "column" || module.assetKey === "column-thin"
        ? createFittedGeometry(module.size, model)
        : createTiledWallGeometry(module.size, model, 2)
      : module.kind === "room-shell" || module.kind === "corridor-shell"
        ? createFittedGeometry(module.size, model)
      : module.kind === "door-open"
        ? createFittedGeometry(module.size, model)
        : module.kind === "door-closed"
          ? createFittedGeometry(module.size, model)
          : createFittedGeometry(module.size, model);
  geometryBySignature.set(signature, geometry);
  return geometry;
}

function createModuleMesh(
  module: ModuleDefinition,
  materials: Readonly<Record<ModuleKind, Material>>,
  options: DungeonSceneBuildOptions,
): Mesh {
  const appearance = options.appearance;
  const surfaceTexture = module.kind === "floor" ? options.textures?.floor
    : module.kind === "wall" ? options.textures?.wall
      : module.kind === "door-frame" ? options.textures?.doorFrame
      : undefined;
  const coverageMeters = module.kind === "floor"
    ? appearance?.floorCoverageMeters ?? 2
    : module.kind === "door-frame"
      ? appearance?.doorFrameCoverageMeters ?? appearance?.wallCoverageMeters ?? 2
      : appearance?.wallCoverageMeters ?? 2;
  const geometry = surfaceTexture
    ? createWorldAlignedUvGeometry(moduleGeometry(module), module, coverageMeters, module.kind === "floor" ? "floor" : "wall")
    : moduleGeometry(module);
  geometry.computeBoundingBox();
  const mesh = new Mesh(geometry, materials[module.kind]);
  mesh.name = module.id;
  mesh.position.fromArray(module.center);
  mesh.rotation.y = module.rotationY;
  mesh.castShadow = module.kind !== "floor";
  mesh.receiveShadow = true;
  mesh.userData = {
    kind: module.kind,
    moduleId: module.id,
    visualPackId: kenneyVisualPack.id,
    sourceModel: modelForModule(module).sourceModel,
  };
  return mesh;
}

export function buildDungeonScene(layout: DungeonLayout, options: DungeonSceneBuildOptions = {}): DungeonSceneResult {
  const appearance = options.appearance ?? layout.appearance;
  const effectiveOptions: DungeonSceneBuildOptions = appearance ? { ...options, appearance } : options;
  const materials = createMaterials(effectiveOptions.textures ?? {});
  const root = new Group();
  root.name = "DungeonRoot";
  root.userData = {
    exportId: layout.exportId,
    schemaVersion: layout.schemaVersion,
    generatorVersion: layout.generatorVersion,
    seed: layout.seed,
    assetPackId: layout.assetPack.id,
    visualPackId: kenneyVisualPack.id,
    visualPackVersion: kenneyVisualPack.version,
    visualPackLicense: kenneyVisualPack.license,
    appearance: effectiveOptions.appearance,
  };

  const floors = new Group();
  floors.name = "Floors";
  const walls = new Group();
  walls.name = "Walls";
  const doors = new Group();
  doors.name = "Doors";
  const shells = new Group();
  shells.name = "Shells";

  for (const module of layout.modules) {
    const mesh = createModuleMesh(module, materials, effectiveOptions);
    if (module.kind === "room-shell" || module.kind === "corridor-shell") shells.add(mesh);
    else if (module.kind === "floor") floors.add(mesh);
    else if (module.kind.startsWith("door")) doors.add(mesh);
    else walls.add(mesh);
  }

  root.add(floors, walls, shells, doors);
  root.updateMatrixWorld(true);
  return {
    root,
    counts: {
      floors: floors.children.length,
      walls: walls.children.length,
      shells: shells.children.length,
      doors: doors.children.length,
    },
  };
}
