import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { exportDungeon } from "../packages/dungeon-renderer/src/index.ts";
import { generateMinimumDungeon } from "../packages/generator-core/src/index.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = resolve(repositoryRoot, "godot/test-project/fixtures");
const layout = generateMinimumDungeon({
  seed: 104729,
  width: 160,
  height: 160,
  corridorWidth: 4,
  doorOpenRate: 0.5,
});
const exported = await exportDungeon(layout);

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(resolve(outputDirectory, `${exported.baseName}.glb`), Buffer.from(exported.glb)),
  writeFile(resolve(outputDirectory, `${exported.baseName}.layout.json`), exported.layoutJson, "utf8"),
]);

console.log(`Generated ${exported.baseName}.glb and ${exported.baseName}.layout.json`);
