import type { DungeonLayout, ModuleDefinition, ModuleKind } from "@mapgen/layout-schema";
import {
  type BufferGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Material,
} from "three";

import { dungeonCollection2Pack } from "./dungeon-collection-2-pack";
import { createFittedGeometry, createTiledFloorGeometry, createTiledWallGeometry } from "./modular-geometry";

export interface DungeonSceneResult {
  readonly root: Group;
  readonly counts: { readonly floors: number; readonly walls: number; readonly doors: number };
}

const materialByKind: Record<ModuleKind, Material> = {
  floor: new MeshStandardMaterial({ color: new Color("#ffffff"), vertexColors: true, roughness: 0.93, metalness: 0.02 }),
  wall: new MeshStandardMaterial({ color: new Color("#ffffff"), vertexColors: true, roughness: 0.88, metalness: 0.01 }),
  "door-frame": new MeshStandardMaterial({ color: new Color("#ffffff"), vertexColors: true, roughness: 0.82, metalness: 0.03 }),
  "door-open": new MeshStandardMaterial({ color: new Color("#ffffff"), vertexColors: true, roughness: 0.72, metalness: 0.05 }),
  "door-closed": new MeshStandardMaterial({ color: new Color("#ffffff"), vertexColors: true, roughness: 0.76, metalness: 0.08 }),
};

const geometryBySignature = new Map<string, BufferGeometry>();

function moduleGeometry(module: ModuleDefinition): BufferGeometry {
  const signature = `${module.kind}:${module.size.join("x")}`;
  const cached = geometryBySignature.get(signature);
  if (cached) return cached;
  const geometry = module.kind === "floor"
    ? createTiledFloorGeometry(module.size, dungeonCollection2Pack.modules.floor)
    : module.kind === "wall"
      ? createTiledWallGeometry(module.size, dungeonCollection2Pack.modules.wall)
      : module.kind === "door-open"
        ? createFittedGeometry(module.size, dungeonCollection2Pack.modules.doorOpen, true)
        : module.kind === "door-closed"
          ? createFittedGeometry(module.size, dungeonCollection2Pack.modules.doorClosed, true)
          : createFittedGeometry(module.size, dungeonCollection2Pack.modules.frame);
  geometryBySignature.set(signature, geometry);
  return geometry;
}

function createModuleMesh(module: ModuleDefinition): Mesh {
  const geometry = moduleGeometry(module);
  geometry.computeBoundingBox();
  const mesh = new Mesh(geometry, materialByKind[module.kind]);
  mesh.name = module.id;
  mesh.position.fromArray(module.center);
  mesh.rotation.y = module.rotationY;
  mesh.castShadow = module.kind !== "floor";
  mesh.receiveShadow = true;
  mesh.userData = {
    kind: module.kind,
    moduleId: module.id,
    visualPackId: dungeonCollection2Pack.id,
    sourceModel: module.kind === "floor" ? dungeonCollection2Pack.modules.floor.sourceModel
      : module.kind === "wall" ? dungeonCollection2Pack.modules.wall.sourceModel
        : module.kind === "door-open" ? dungeonCollection2Pack.modules.doorOpen.sourceModel
          : module.kind === "door-closed" ? dungeonCollection2Pack.modules.doorClosed.sourceModel
            : dungeonCollection2Pack.modules.frame.sourceModel,
  };
  return mesh;
}

export function buildDungeonScene(layout: DungeonLayout): DungeonSceneResult {
  const root = new Group();
  root.name = "DungeonRoot";
  root.userData = {
    exportId: layout.exportId,
    schemaVersion: layout.schemaVersion,
    generatorVersion: layout.generatorVersion,
    seed: layout.seed,
    assetPackId: layout.assetPack.id,
    visualPackId: dungeonCollection2Pack.id,
    visualPackVersion: dungeonCollection2Pack.version,
    visualPackLicense: dungeonCollection2Pack.license,
  };

  const floors = new Group();
  floors.name = "Floors";
  const walls = new Group();
  walls.name = "Walls";
  const doors = new Group();
  doors.name = "Doors";

  for (const module of layout.modules) {
    const mesh = createModuleMesh(module);
    if (module.kind === "floor") floors.add(mesh);
    else if (module.kind.startsWith("door")) doors.add(mesh);
    else walls.add(mesh);
  }

  root.add(floors, walls, doors);
  root.updateMatrixWorld(true);
  return {
    root,
    counts: {
      floors: floors.children.length,
      walls: walls.children.length,
      doors: doors.children.length,
    },
  };
}
