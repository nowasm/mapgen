import { describe, expect, it } from "vitest";

import { rpgCoboVisualPack } from "./rpgcobo-visual-pack";
import { createPatternedBoxGeometry } from "./voxel-geometry";

function trianglesOnPlane(
  positions: ArrayLike<number>,
  axis: 0 | 1 | 2,
  coordinate: number,
): number {
  let count = 0;
  for (let offset = 0; offset < positions.length; offset += 9) {
    const onPlane = [0, 1, 2].every((vertex) => (
      Math.abs(positions[offset + vertex * 3 + axis]! - coordinate) < 0.000_001
    ));
    if (onPlane) count += 1;
  }
  return count;
}

describe("patterned voxel-derived geometry", () => {
  it("does not place a second full face over the patterned floor surface", () => {
    const geometry = createPatternedBoxGeometry([4, 0.2, 4], rpgCoboVisualPack.modules.floor, "floor");
    const positions = geometry.getAttribute("position").array;

    expect(trianglesOnPlane(positions, 1, 0.1)).toBe(4 * 4 * 2);
    expect(trianglesOnPlane(positions, 1, -0.1)).toBe(2);
  });

  it("does not place full faces over either patterned wall surface", () => {
    const alongX = createPatternedBoxGeometry([4, 2.5, 0.3], rpgCoboVisualPack.modules.wall, "wall");
    const alongZ = createPatternedBoxGeometry([0.3, 2.5, 4], rpgCoboVisualPack.modules.wall, "wall");
    const expectedSurfaceTriangles = Math.ceil(4 * 2) * Math.ceil(2.5 * 2) * 2;

    expect(trianglesOnPlane(alongX.getAttribute("position").array, 2, 0.15)).toBe(expectedSurfaceTriangles);
    expect(trianglesOnPlane(alongX.getAttribute("position").array, 2, -0.15)).toBe(expectedSurfaceTriangles);
    expect(trianglesOnPlane(alongZ.getAttribute("position").array, 0, 0.15)).toBe(expectedSurfaceTriangles);
    expect(trianglesOnPlane(alongZ.getAttribute("position").array, 0, -0.15)).toBe(expectedSurfaceTriangles);
  });
});
