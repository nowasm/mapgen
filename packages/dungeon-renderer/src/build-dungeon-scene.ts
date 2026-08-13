import type { DungeonLayout, ModuleDefinition, ModuleKind } from "@mapgen/layout-schema";
import {
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Material,
} from "three";

export interface DungeonSceneResult {
  readonly root: Group;
  readonly counts: { readonly floors: number; readonly walls: number; readonly doors: number };
}

const materialByKind: Record<ModuleKind, Material> = {
  floor: new MeshStandardMaterial({ color: new Color("#4d5350"), roughness: 0.93, metalness: 0.02 }),
  wall: new MeshStandardMaterial({ color: new Color("#887760"), roughness: 0.88, metalness: 0.01 }),
  "door-frame": new MeshStandardMaterial({ color: new Color("#302c27"), roughness: 0.7, metalness: 0.18 }),
  "door-open": new MeshStandardMaterial({ color: new Color("#9a5b2d"), roughness: 0.72, metalness: 0.05 }),
  "door-closed": new MeshStandardMaterial({ color: new Color("#713f22"), roughness: 0.76, metalness: 0.08 }),
};

function createModuleMesh(module: ModuleDefinition): Mesh {
  const geometry = new BoxGeometry(...module.size);
  geometry.computeBoundingBox();
  const mesh = new Mesh(geometry, materialByKind[module.kind]);
  mesh.name = module.id;
  mesh.position.fromArray(module.center);
  mesh.rotation.y = module.rotationY;
  mesh.castShadow = module.kind !== "floor";
  mesh.receiveShadow = true;
  mesh.userData = { kind: module.kind, moduleId: module.id };
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
