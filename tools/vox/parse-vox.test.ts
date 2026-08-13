import { describe, expect, it } from "vitest";

import { findNamedVoxModel, parseVox } from "./parse-vox";

function u32(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
}

function text(value: string): number[] {
  return [...new TextEncoder().encode(value)];
}

function voxString(value: string): number[] {
  const bytes = text(value);
  return [...u32(bytes.length), ...bytes];
}

function dictionary(entries: Readonly<Record<string, string>>): number[] {
  return [...u32(Object.keys(entries).length), ...Object.entries(entries).flatMap(([key, value]) => [...voxString(key), ...voxString(value)])];
}

function chunk(id: string, content: readonly number[], children: readonly number[] = []): number[] {
  return [...text(id), ...u32(content.length), ...u32(children.length), ...content, ...children];
}

function fixture(): Uint8Array {
  const size = chunk("SIZE", [...u32(2), ...u32(1), ...u32(1)]);
  const xyzi = chunk("XYZI", [...u32(2), 0, 0, 0, 1, 1, 0, 0, 2]);
  const palette = chunk("RGBA", Array.from({ length: 256 * 4 }, (_, index) => index % 4 === 3 ? 255 : index % 256));
  const shape = chunk("nSHP", [...u32(2), ...dictionary({}), ...u32(1), ...u32(0), ...dictionary({})]);
  const transform = chunk("nTRN", [...u32(1), ...dictionary({ _name: "brick1" }), ...u32(2), ...u32(0xffff_ffff), ...u32(0), ...u32(1), ...dictionary({})]);
  const children = [...size, ...xyzi, ...palette, ...shape, ...transform];
  return Uint8Array.from([...text("VOX "), ...u32(200), ...chunk("MAIN", [], children)]);
}

describe("parseVox", () => {
  it("reads size, voxels, palette, and a named scene model", () => {
    const parsed = parseVox(fixture());
    const model = findNamedVoxModel(parsed, "brick1");

    expect(model.size).toEqual([2, 1, 1]);
    expect(model.voxels).toEqual([
      { x: 0, y: 0, z: 0, colorIndex: 1 },
      { x: 1, y: 0, z: 0, colorIndex: 2 },
    ]);
    expect(parsed.palette).toHaveLength(256);
  });

  it("rejects truncated chunks", () => {
    const source = fixture();
    expect(() => parseVox(source.subarray(0, source.length - 1))).toThrow(/bounds/);
  });

  it("rejects unsupported versions", () => {
    const source = fixture();
    source[4] = 199;
    expect(() => parseVox(source)).toThrow(/version/);
  });
});
