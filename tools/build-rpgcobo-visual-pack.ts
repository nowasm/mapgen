import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { findNamedVoxModel, parseVox, type ParsedVox, type VoxModel } from "./vox/parse-vox";

const CONVERTER_VERSION = "1.0.0";
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = resolve(repositoryRoot, "..", "rpgcobo-tool");
const outputDirectory = resolve(repositoryRoot, "assets", "rpgcobo");
const mapConfigPath = resolve(sourceRoot, "project", "resource", "map_vox.json");

interface Variation {
  readonly pal0?: readonly number[];
  readonly vp0?: readonly string[];
  readonly vp1?: readonly string[] | null;
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function unpackColor(value: number): readonly [number, number, number, number] {
  return [(value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff, 255];
}

function paletteOverride(values: readonly number[] | undefined): Map<number, readonly [number, number, number, number]> {
  const result = new Map<number, readonly [number, number, number, number]>();
  if (!values) return result;
  for (let index = 0; index + 1 < values.length; index += 2) result.set(values[index]!, unpackColor(values[index + 1]!));
  return result;
}

function serializeModel(
  parsed: ParsedVox,
  model: VoxModel,
  overrideValues: readonly number[] | undefined,
) {
  const overrides = paletteOverride(overrideValues);
  const usedIndices = [...new Set(model.voxels.map(({ colorIndex }) => colorIndex))].sort((a, b) => a - b);
  return {
    sourceModel: model.name,
    size: model.size,
    palette: Object.fromEntries(usedIndices.map((index) => [String(index), overrides.get(index) ?? parsed.palette[index - 1] ?? [255, 0, 255, 255]])),
    voxels: model.voxels.map(({ x, y, z, colorIndex }) => [x, y, z, colorIndex]),
  };
}

async function loadSource(relativePath: string): Promise<{ bytes: Uint8Array; parsed: ParsedVox; source: { path: string; sha256: string } }> {
  const absolutePath = resolve(sourceRoot, relativePath);
  const bytes = await readFile(absolutePath);
  return {
    bytes,
    parsed: parseVox(bytes),
    source: { path: relative(sourceRoot, absolutePath).replaceAll("\\", "/"), sha256: sha256(bytes) },
  };
}

function findVariation(
  collection: Record<string, Variation>,
  field: "vp0" | "vp1",
  container: string,
  model: string,
): Variation {
  const variation = Object.values(collection).find((candidate) => candidate[field]?.[0] === container && candidate[field]?.[1] === model);
  if (!variation) throw new RangeError(`RPG-Cobo variation not found: ${container}/${model}`);
  return variation;
}

const configBytes = await readFile(mapConfigPath);
const config = JSON.parse(configBytes.toString("utf8")) as { struct0: Record<string, Variation>; door: Record<string, Variation> };
const wallVariation = findVariation(config.struct0, "vp0", "wall1", "brick1");
const floorVariation = findVariation(config.struct0, "vp1", "pave1", "stone4");
const doorVariation = findVariation(config.door, "vp0", "indoor1", "door1");
const wall = await loadSource("project/resource/vox/map/wall/wall1.vox");
const floor = await loadSource("project/resource/vox/map/floor/pave1.vox");
const door = await loadSource("project/resource/vox/map/door/indoor1.vox");

const pack = {
  id: "rpgcobo-dungeon-stone",
  version: 1,
  converterVersion: CONVERTER_VERSION,
  license: "Apache-2.0",
  modified: true,
  coordinateNote: "Source VOX axes are normalized by the Mapgen renderer; models are tiled or scaled into semantic modules.",
  sources: [
    wall.source,
    floor.source,
    door.source,
    { path: "project/resource/map_vox.json", sha256: sha256(configBytes) },
  ],
  modules: {
    wall: serializeModel(wall.parsed, findNamedVoxModel(wall.parsed, "brick1/mid"), wallVariation.pal0),
    floor: serializeModel(floor.parsed, findNamedVoxModel(floor.parsed, "stone4"), floorVariation.pal0),
    doorClosed: serializeModel(door.parsed, findNamedVoxModel(door.parsed, "door1/close"), doorVariation.pal0),
    doorOpen: serializeModel(door.parsed, findNamedVoxModel(door.parsed, "door1/open"), doorVariation.pal0),
  },
} as const;

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(resolve(outputDirectory, "dungeon-visual-pack.json"), `${JSON.stringify(pack, null, 2)}\n`, "utf8"),
  copyFile(resolve(sourceRoot, "LICENSE"), resolve(outputDirectory, "LICENSE")),
  copyFile(resolve(sourceRoot, "NOTICE.txt"), resolve(outputDirectory, "NOTICE.txt")),
  writeFile(resolve(outputDirectory, "SOURCE_MANIFEST.md"), `# RPG-Cobo 地牢视觉包来源清单

该目录包含从 RPG-Cobo 默认素材机械转换的派生数据。上游项目和默认素材以 Apache License 2.0 发布；完整许可证与 NOTICE 随目录保存。

- 上游仓库：\`rpgcobo-tool\`
- 转换器：\`tools/build-rpgcobo-visual-pack.ts\` v${CONVERTER_VERSION}
- 修改：子模型筛选、调色映射、坐标归一、表面重复与门洞缩放
- 墙：\`wall1.vox / brick1/mid\`
- 地板：\`pave1.vox / stone4\`
- 门：\`indoor1.vox / door1/open|close\`

每个输入文件的 SHA-256 保存在 \`dungeon-visual-pack.json\`。原始 VOX 文件未复制到本仓库，生成包仅包含所选模型的体素和颜色数据。
`, "utf8"),
]);

console.log(`Generated ${pack.id}: wall=${pack.modules.wall.voxels.length}, floor=${pack.modules.floor.voxels.length}, doors=${pack.modules.doorClosed.voxels.length}/${pack.modules.doorOpen.voxels.length}`);
