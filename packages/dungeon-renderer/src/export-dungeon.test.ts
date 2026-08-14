import { generateMinimumDungeon } from "@mapgen/generator-core";
import { describe, expect, it } from "vitest";

import { exportDungeon } from "./export-dungeon";

describe("exportDungeon", () => {
  it("exports a binary GLB and a JSON layout with its digest", async () => {
    const layout = generateMinimumDungeon({ seed: 11 });
    const exported = await exportDungeon(layout);
    const header = new Uint8Array(exported.glb).slice(0, 4);
    const json = JSON.parse(exported.layoutJson) as Record<string, unknown>;

    expect(Array.from(header)).toEqual([0x67, 0x6c, 0x54, 0x46]);
    expect(exported.glbSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(json.exportId).toBe(layout.exportId);
    expect(json.glbSha256).toBe(exported.glbSha256);
    expect(exported.baseName).toBe(`dungeon-${layout.exportId}`);
  });

  it("snapshots editor appearance into the paired layout JSON", async () => {
    const layout = generateMinimumDungeon({ seed: 12 });
    const appearance = {
      materialPackId: "bricks-and-tiles-1.0",
      wallTextureId: "bt-2-001",
      floorTextureId: "bt-2-002",
      doorFrameTextureId: "follow-wall",
      wallCoverageMeters: 2,
      floorCoverageMeters: 3,
      doorFrameCoverageMeters: 2,
    } as const;
    const exported = await exportDungeon(layout, { appearance });
    const json = JSON.parse(exported.layoutJson) as Record<string, unknown>;

    expect(json.appearance).toEqual(appearance);
  });
});
