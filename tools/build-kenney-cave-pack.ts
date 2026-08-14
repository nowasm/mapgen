import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { decodeRgbaPng, samplePng } from "./image/decode-png";
import { parseMtl, parseObj, type ParseObjOptions } from "./obj/parse-obj";

const CONVERTER_VERSION = "1.0.0";
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = resolve(repositoryRoot, "assets", "kenney_modular-cave-kit_1.0");
const objRoot = resolve(sourceRoot, "Models", "OBJ format");
const texturePath = resolve(objRoot, "Textures", "colormap.png");
const licensePath = resolve(sourceRoot, "License.txt");
const outputPath = resolve(sourceRoot, "cave-visual-pack.json");

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

const textureBytes = await readFile(texturePath);
const texture = decodeRgbaPng(textureBytes);

async function loadModel(baseName: string, options: ParseObjOptions = {}) {
  const objPath = resolve(objRoot, `${baseName}.obj`);
  const mtlPath = resolve(objRoot, `${baseName}.mtl`);
  const [objBytes, mtlBytes] = await Promise.all([readFile(objPath), readFile(mtlPath)]);
  const parsed = parseObj(objBytes.toString("utf8"), parseMtl(mtlBytes.toString("utf8")), options);
  const colors: number[] = [];
  for (let offset = 0; offset < parsed.uvs.length; offset += 2) {
    colors.push(...samplePng(texture, parsed.uvs[offset]!, parsed.uvs[offset + 1]!));
  }
  return {
    model: {
      sourceModel: `${baseName}${options.groups ? `#${options.groups.join("+")}` : ""}`,
      positions: parsed.positions,
      colors,
      bounds: parsed.bounds,
    },
    sources: [objPath, mtlPath].map((path, index) => ({
      path: relative(repositoryRoot, path).replaceAll("\\", "/"),
      sha256: sha256(index === 0 ? objBytes : mtlBytes),
    })),
  };
}

const [
  floor, floorAlt, wall, wallAlt, wallCorner, frameRock, frameOverhang, frameMetal, doorBars,
  corridor, corridorWide,
  roomSmall, roomSmallVariation, roomLarge, roomLargeVariation, roomWide, roomWideVariation,
] = await Promise.all([
  loadModel("template-floor-detail"),
  loadModel("template-floor-detail-a"),
  loadModel("template-wall"),
  loadModel("template-wall-detail-a"),
  loadModel("template-wall-corner"),
  loadModel("gate-rock"),
  loadModel("gate-overhang"),
  loadModel("gate-metal-bars", { groups: ["gate-metal-bars"] }),
  loadModel("gate-metal-bars", { groups: ["gate"] }),
  loadModel("corridor"),
  loadModel("corridor-wide"),
  loadModel("room-small"),
  loadModel("room-small-variation"),
  loadModel("room-large"),
  loadModel("room-large-variation"),
  loadModel("room-wide"),
  loadModel("room-wide-variation"),
]);
const licenseBytes = await readFile(licensePath);
const pack = {
  id: "kenney-modular-cave-kit-1.0",
  version: 1,
  converterVersion: CONVERTER_VERSION,
  license: "CC0-1.0",
  modified: true,
  coordinateNote: "Kenney 4-unit modules are tiled without vertical repetition; colormap UVs are baked to vertex colors for self-contained GLB export.",
  sources: [
    ...floor.sources, ...floorAlt.sources, ...wall.sources, ...wallAlt.sources, ...wallCorner.sources,
    ...frameRock.sources, ...frameOverhang.sources, ...frameMetal.sources, ...doorBars.sources,
    ...corridor.sources, ...corridorWide.sources,
    ...roomSmall.sources, ...roomSmallVariation.sources,
    ...roomLarge.sources, ...roomLargeVariation.sources,
    ...roomWide.sources, ...roomWideVariation.sources,
    { path: relative(repositoryRoot, texturePath).replaceAll("\\", "/"), sha256: sha256(textureBytes) },
    { path: relative(repositoryRoot, licensePath).replaceAll("\\", "/"), sha256: sha256(licenseBytes) },
  ],
  modules: {
    floor: floor.model,
    floorAlt: floorAlt.model,
    wall: wall.model,
    wallAlt: wallAlt.model,
    wallCorner: wallCorner.model,
    frameRock: frameRock.model,
    frameOverhang: frameOverhang.model,
    frameMetal: frameMetal.model,
    doorBars: doorBars.model,
    corridor: corridor.model,
    corridorWide: corridorWide.model,
    roomSmall: roomSmall.model,
    roomSmallVariation: roomSmallVariation.model,
    roomLarge: roomLarge.model,
    roomLargeVariation: roomLargeVariation.model,
    roomWide: roomWide.model,
    roomWideVariation: roomWideVariation.model,
  },
};

await writeFile(outputPath, `${JSON.stringify(pack, null, 2)}\n`, "utf8");
console.log(`Generated ${pack.id}: 17 prototypes, rooms=${[roomSmall, roomLarge, roomWide].reduce((sum, entry) => sum + entry.model.positions.length / 9, 0)} base triangles`);
