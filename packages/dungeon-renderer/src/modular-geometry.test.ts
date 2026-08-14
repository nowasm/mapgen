import { Box3, type BufferAttribute, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import { kenneyVisualPack, type PackedObjModel } from "./kenney-visual-pack";
import { createFittedGeometry, createTiledFloorGeometry, createTiledWallGeometry, createWorldAlignedUvGeometry } from "./modular-geometry";

function geometrySize(geometry: ReturnType<typeof createFittedGeometry>): readonly number[] {
  const size = new Box3().setFromBufferAttribute(geometry.getAttribute("position") as BufferAttribute).getSize(new Vector3());
  return [size.x, size.y, size.z];
}

describe("Kenney Building Kit geometry", () => {
  it("tiles 2m floors to their exact semantic bounds", () => {
    const geometry = createTiledFloorGeometry([8, 0.2, 8], kenneyVisualPack.modules.floor, 2);

    expect(geometrySize(geometry).map((value) => Number(value.toFixed(5)))).toEqual([8, 0.2, 8]);
    expect(geometry.getAttribute("position").count).toBe(kenneyVisualPack.modules.floor.positions.length / 3 * 16);
  });

  it("maps the source wall's local Z span onto either room boundary axis", () => {
    const alongX = createTiledWallGeometry([8, 3.2, 0.2], kenneyVisualPack.modules.wall, 2);
    const alongZ = createTiledWallGeometry([0.2, 3.2, 8], kenneyVisualPack.modules.wall, 2);

    expect(geometrySize(alongX).map((value) => Number(value.toFixed(5)))).toEqual([8, 3.2, 0.2]);
    expect(geometrySize(alongZ).map((value) => Number(value.toFixed(5)))).toEqual([0.2, 3.2, 8]);
  });

  it("fits native rounded corners and doorway frames to semantic slots", () => {
    const corner = createFittedGeometry([2, 3.2, 2], kenneyVisualPack.modules.wallCornerRound);
    const frame = createFittedGeometry([0.4, 3.2, 4], kenneyVisualPack.modules.frameWideRound);

    expect(geometrySize(corner).map((value) => Number(value.toFixed(5)))).toEqual([2, 3.2, 2]);
    expect(geometrySize(frame).map((value) => Number(value.toFixed(5)))).toEqual([0.4, 3.2, 4]);
    expect(frame.getAttribute("color").count).toBe(frame.getAttribute("position").count);
  });

  it("converts baked sRGB bytes into linear vertex colors", () => {
    const model: PackedObjModel = {
      sourceModel: "color-space-fixture",
      positions: [0, 0, 0, 1, 0, 0, 0, 1, 1],
      colors: [128, 64, 32, 128, 64, 32, 128, 64, 32],
      bounds: { min: [0, 0, 0], max: [1, 1, 1] },
    };
    const geometry = createFittedGeometry([1, 1, 1], model);
    const colors = geometry.getAttribute("color").array;

    expect(colors[0]).toBeCloseTo(0.215861);
    expect(colors[1]).toBeCloseTo(0.051269);
    expect(colors[2]).toBeCloseTo(0.014444);
  });

  it("adds world-aligned UVs without mutating cached source geometry", () => {
    const source = createTiledFloorGeometry([4, 0.2, 4], kenneyVisualPack.modules.floor, 2);
    const textured = createWorldAlignedUvGeometry(source, {
      id: "floor-test",
      kind: "floor",
      center: [10, 0, -6],
      size: [4, 0.2, 4],
      rotationY: Math.PI / 2,
    }, 2, "floor");

    expect(source.getAttribute("uv")).toBeUndefined();
    expect(textured.getAttribute("uv").count).toBe(textured.getAttribute("position").count);
    expect(Array.from(textured.getAttribute("uv").array).some((value) => Math.abs(value) > 1)).toBe(true);
  });

  it("rejects non-positive coverage sizes", () => {
    const source = createTiledWallGeometry([2, 3.2, 0.2], kenneyVisualPack.modules.wall, 2);
    expect(() => createWorldAlignedUvGeometry(source, {
      id: "wall-test",
      kind: "wall",
      center: [0, 0, 0],
      size: [2, 3.2, 0.2],
      rotationY: 0,
    }, 0, "wall")).toThrow(/coverageMeters/);
  });
});
