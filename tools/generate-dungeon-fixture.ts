import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { exportDungeon } from "../packages/dungeon-renderer/src/index.ts";
import { generateDungeon } from "../packages/generator-core/src/index.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = resolve(repositoryRoot, "godot/test-project/fixtures");
const layout = generateDungeon({ seed: 104729 });
const exported = await exportDungeon(layout);

await mkdir(outputDirectory, { recursive: true });
for (const fileName of await readdir(outputDirectory)) {
  if ((fileName.endsWith(".glb") || fileName.endsWith(".layout.json")) && fileName !== `${exported.baseName}.glb` && fileName !== `${exported.baseName}.layout.json`) {
    await unlink(resolve(outputDirectory, fileName));
  }
}
await Promise.all([
  writeFile(resolve(outputDirectory, `${exported.baseName}.glb`), Buffer.from(exported.glb)),
  writeFile(resolve(outputDirectory, `${exported.baseName}.layout.json`), exported.layoutJson, "utf8"),
]);

console.log(`Generated ${exported.baseName}: ${layout.rooms.length} rooms, ${layout.colliders.length} colliders`);
