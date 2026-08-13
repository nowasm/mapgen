import type { DungeonLayout, ModuleDefinition, ModuleKind } from "@mapgen/layout-schema";
import {
  BoxGeometry,
  type BufferGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Material,
} from "three";

import { rpgCoboVisualPack } from "./rpgcobo-visual-pack";
import { createDoorVoxelGeometry, createPatternedBoxGeometry } from "./voxel-geometry";

export interface DungeonSceneResult {
  readonly root: Group;
  readonly counts: { readonly floors: number; readonly walls: number; readonly doors: number };
}

const materialByKind: Record<ModuleKind, Material> = {
  floor: new MeshStandardMaterial({ color: new Color("#ffffff"), vertexColors: true, roughness: 0.93, metalness: 0.02 }),
  wall: new MeshStandardMaterial({ color: new Color("#ffffff"), vertexColors: true, roughness: 0.88, metalness: 0.01 }),
  "door-frame": new MeshStandardMaterial({ color: new Color("#302c27"), roughness: 0.7, metalness: 0.18 }),
  "door-open": new MeshStandardMaterial({ color: new Color("#ffffff"), vertexColors: true, roughness: 0.72, metalness: 0.05 }),
  "door-closed": new MeshStandardMaterial({ color: new Color("#ffffff"), vertexColors: true, roughness: 0.76, metalness: 0.08 }),
};

const geometryBySignature = new Map<string, BufferGeometry>();

function moduleGeometry(module: ModuleDefinition): BufferGeometry {
  const signature = `${module.kind}:${module.size.join("x")}`;
  const cached = geometryBySignature.get(signature);
  if (cached) return cached;
  const geometry = module.kind === "floor"
    ? createPatternedBoxGeometry(module.size, rpgCoboVisualPack.modules.floor, "floor")
    : module.kind === "wall"
      ? createPatternedBoxGeometry(module.size, rpgCoboVisualPack.modules.wall, "wall")
      : module.kind === "door-open"
        ? createDoorVoxelGeometry(module.size, rpgCoboVisualPack.modules.doorOpen)
        : module.kind === "door-closed"
          ? createDoorVoxelGeometry(module.size, rpgCoboVisualPack.modules.doorClosed)
          : new BoxGeometry(...module.size);
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
    visualPackId: rpgCoboVisualPack.id,
    sourceModel: module.kind === "floor" ? rpgCoboVisualPack.modules.floor.sourceModel
      : module.kind === "wall" ? rpgCoboVisualPack.modules.wall.sourceModel
        : module.kind === "door-open" ? rpgCoboVisualPack.modules.doorOpen.sourceModel
          : module.kind === "door-closed" ? rpgCoboVisualPack.modules.doorClosed.sourceModel : undefined,
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
    visualPackId: rpgCoboVisualPack.id,
    visualPackVersion: rpgCoboVisualPack.version,
    visualPackLicense: rpgCoboVisualPack.license,
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
