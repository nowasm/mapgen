import { Box3, type BufferAttribute, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import { dungeonCollection2Pack } from "./dungeon-collection-2-pack";
import { createFittedGeometry, createTiledFloorGeometry, createTiledWallGeometry } from "./modular-geometry";

function geometrySize(geometry: ReturnType<typeof createFittedGeometry>): readonly number[] {
  const size = new Box3().setFromBufferAttribute(geometry.getAttribute("position") as BufferAttribute).getSize(new Vector3());
  return [size.x, size.y, size.z];
}

describe("Dungeon Collection 2 modular geometry", () => {
  it("tiles floors to their exact semantic bounds", () => {
    const geometry = createTiledFloorGeometry([4, 0.2, 3], dungeonCollection2Pack.modules.floor);

    expect(geometrySize(geometry)).toEqual([4, 0.20000000298023224, 3]);
    expect(geometry.getAttribute("position").count).toBe(12 * 36);
  });

  it("tiles walls along either horizontal axis", () => {
    const alongX = createTiledWallGeometry([4, 2.5, 0.3], dungeonCollection2Pack.modules.wall);
    const alongZ = createTiledWallGeometry([0.3, 2.5, 4], dungeonCollection2Pack.modules.wall);

    expect(geometrySize(alongX).map((value) => Number(value.toFixed(5)))).toEqual([4, 2.5, 0.3]);
    expect(geometrySize(alongZ).map((value) => Number(value.toFixed(5)))).toEqual([0.3, 2.5, 4]);
  });

  it("fits the source door width to the semantic local Z axis", () => {
    const geometry = createFittedGeometry([0.3, 2.1, 3.4], dungeonCollection2Pack.modules.doorClosed, true);

    expect(geometrySize(geometry).map((value) => Number(value.toFixed(5)))).toEqual([0.3, 2.1, 3.4]);
    expect(geometry.getAttribute("color").count).toBe(geometry.getAttribute("position").count);
  });
});
