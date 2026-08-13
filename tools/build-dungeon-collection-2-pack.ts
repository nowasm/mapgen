import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseMtl, parseObj } from "./obj/parse-obj";

const CONVERTER_VERSION = "1.0.0";
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = resolve(repositoryRoot, "assets", "dungeon_collection_2");
const outputPath = resolve(sourceRoot, "dungeon-visual-pack.json");

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function loadModel(baseName: string) {
  const objPath = resolve(sourceRoot, `${baseName}.obj`);
  const mtlPath = resolve(sourceRoot, `${baseName}.mtl`);
  const [objBytes, mtlBytes] = await Promise.all([readFile(objPath), readFile(mtlPath)]);
  return {
    sourceModel: baseName,
    ...parseObj(objBytes.toString("utf8"), parseMtl(mtlBytes.toString("utf8"))),
    sources: [objPath, mtlPath].map((path, index) => ({
      path: relative(repositoryRoot, path).replaceAll("\\", "/"),
      sha256: sha256(index === 0 ? objBytes : mtlBytes),
    })),
  };
}

const [floor, wall, frame, door] = await Promise.all([
  loadModel("struct_floor_normal"),
  loadModel("struct_wall_straight_main"),
  loadModel("struct_block_normal"),
  loadModel("prop_wall_big_door_wood"),
]);

const pack = {
  id: "dungeon-collection-2",
  version: 1,
  converterVersion: CONVERTER_VERSION,
  license: "UNSPECIFIED (user-provided)",
  modified: true,
  coordinateNote: "OBJ geometry is normalized and tiled or fitted into semantic Mapgen modules.",
  sources: [...floor.sources, ...wall.sources, ...frame.sources, ...door.sources],
  modules: { floor, wall, frame, doorClosed: door, doorOpen: door },
};

await writeFile(outputPath, `${JSON.stringify(pack, null, 2)}\n`, "utf8");
console.log(`Generated ${pack.id}: floor=${floor.positions.length / 9}, wall=${wall.positions.length / 9}, frame=${frame.positions.length / 9}, door=${door.positions.length / 9} triangles`);
