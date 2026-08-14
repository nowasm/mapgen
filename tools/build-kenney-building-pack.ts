import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { decodeRgbaPng, samplePng } from "./image/decode-png";
import { parseMtl, parseObj } from "./obj/parse-obj";

const CONVERTER_VERSION = "1.0.0";
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = resolve(repositoryRoot, "assets", "kenney_building-kit");
const objRoot = resolve(sourceRoot, "Models", "OBJ format");
const texturePath = resolve(objRoot, "Textures", "colormap.png");
const licensePath = resolve(sourceRoot, "License.txt");
const outputPath = resolve(sourceRoot, "building-visual-pack.json");

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

const textureBytes = await readFile(texturePath);
const texture = decodeRgbaPng(textureBytes);

async function loadModel(baseName: string) {
  const objPath = resolve(objRoot, `${baseName}.obj`);
  const mtlPath = resolve(objRoot, `${baseName}.mtl`);
  const [objBytes, mtlBytes] = await Promise.all([readFile(objPath), readFile(mtlPath)]);
  const parsed = parseObj(objBytes.toString("utf8"), parseMtl(mtlBytes.toString("utf8")));
  const colors: number[] = [];
  for (let offset = 0; offset < parsed.uvs.length; offset += 2) {
    colors.push(...samplePng(texture, parsed.uvs[offset]!, parsed.uvs[offset + 1]!));
  }
  return {
    model: {
      sourceModel: baseName,
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

const sourceNames = [
  "floor", "floor-half", "floor-quarter", "floor-corner-diagonal", "floor-corner-round",
  "wall", "wall-half", "wall-corner", "wall-corner-column", "wall-corner-diagonal", "wall-corner-round",
  "wall-doorway-square", "wall-doorway-round", "wall-doorway-wide-square", "wall-doorway-wide-round",
  "door-rotate-square-a", "door-rotate-square-b", "door-rotate-square-c", "door-rotate-square-d",
  "door-rotate-round-a", "door-rotate-round-b", "door-rotate-round-c", "door-rotate-round-d",
  "column", "column-thin",
] as const;
const loaded = await Promise.all(sourceNames.map(loadModel));
const byName = Object.fromEntries(sourceNames.map((name, index) => [name, loaded[index]!])) as Record<typeof sourceNames[number], Awaited<ReturnType<typeof loadModel>>>;
const licenseBytes = await readFile(licensePath);

const pack = {
  id: "kenney-building-kit-1.0",
  version: 1,
  converterVersion: CONVERTER_VERSION,
  license: "CC0-1.0",
  modified: true,
  coordinateNote: "Kenney 2-unit modules are fitted to semantic slots; colormap UVs are baked to vertex colors for self-contained GLB export.",
  sources: [
    ...loaded.flatMap(({ sources }) => sources),
    { path: relative(repositoryRoot, texturePath).replaceAll("\\", "/"), sha256: sha256(textureBytes) },
    { path: relative(repositoryRoot, licensePath).replaceAll("\\", "/"), sha256: sha256(licenseBytes) },
  ],
  modules: {
    floor: byName.floor.model,
    floorHalf: byName["floor-half"].model,
    floorQuarter: byName["floor-quarter"].model,
    floorCornerDiagonal: byName["floor-corner-diagonal"].model,
    floorCornerRound: byName["floor-corner-round"].model,
    wall: byName.wall.model,
    wallHalf: byName["wall-half"].model,
    wallCorner: byName["wall-corner"].model,
    wallCornerColumn: byName["wall-corner-column"].model,
    wallCornerDiagonal: byName["wall-corner-diagonal"].model,
    wallCornerRound: byName["wall-corner-round"].model,
    frameSquare: byName["wall-doorway-square"].model,
    frameRound: byName["wall-doorway-round"].model,
    frameWideSquare: byName["wall-doorway-wide-square"].model,
    frameWideRound: byName["wall-doorway-wide-round"].model,
    doorSquareA: byName["door-rotate-square-a"].model,
    doorSquareB: byName["door-rotate-square-b"].model,
    doorSquareC: byName["door-rotate-square-c"].model,
    doorSquareD: byName["door-rotate-square-d"].model,
    doorRoundA: byName["door-rotate-round-a"].model,
    doorRoundB: byName["door-rotate-round-b"].model,
    doorRoundC: byName["door-rotate-round-c"].model,
    doorRoundD: byName["door-rotate-round-d"].model,
    column: byName.column.model,
    columnThin: byName["column-thin"].model,
  },
};

await writeFile(outputPath, `${JSON.stringify(pack, null, 2)}\n`, "utf8");
console.log(`Generated ${pack.id}: ${sourceNames.length} modular prototypes`);
