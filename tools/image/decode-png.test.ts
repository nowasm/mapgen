import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { decodeRgbaPng, samplePng } from "./decode-png";

describe("Kenney colormap decoding", () => {
  it("decodes the bundled 512px indexed palette", async () => {
    const bytes = await readFile(resolve("assets/kenney_building-kit/Models/OBJ format/Textures/colormap.png"));
    const image = decodeRgbaPng(bytes);

    expect([image.width, image.height, image.rgba.length]).toEqual([512, 512, 512 * 512 * 4]);
    expect(new Set([samplePng(image, 0.25, 0.25).join(","), samplePng(image, 0.75, 0.75).join(",")]).size).toBe(2);
  });
});
