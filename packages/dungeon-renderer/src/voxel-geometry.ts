import type { Vec3 } from "@mapgen/layout-schema";
import { BufferGeometry, Float32BufferAttribute } from "three";

import { packedColor, type PackedColor, type PackedVoxModel } from "./rpgcobo-visual-pack";

type Point = readonly [number, number, number];

class GeometryBuilder {
  readonly positions: number[] = [];
  readonly colors: number[] = [];

  quad(a: Point, b: Point, c: Point, d: Point, color: PackedColor): void {
    for (const point of [a, b, c, a, c, d]) {
      this.positions.push(...point);
      this.colors.push(color[0] / 255, color[1] / 255, color[2] / 255);
    }
  }

  build(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute("color", new Float32BufferAttribute(this.colors, 3));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  }
}

function key(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

function dominantColor(model: PackedVoxModel): PackedColor {
  const counts = new Map<number, number>();
  for (const voxel of model.voxels) counts.set(voxel[3], (counts.get(voxel[3]) ?? 0) + 1);
  const index = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 1;
  return packedColor(model, index);
}

function surfaceMap(model: PackedVoxModel, axis: "top" | "front" | "back"): Map<string, PackedColor> {
  const selected = new Map<string, { depth: number; color: PackedColor }>();
  for (const [x, y, z, colorIndex] of model.voxels) {
    const coordinateKey = axis === "top" ? `${x},${y}` : `${x},${z}`;
    const depth = axis === "top" ? z : y;
    const current = selected.get(coordinateKey);
    const replace = !current || (axis === "back" ? depth > current.depth : depth < current.depth) || (axis === "top" && depth > current.depth);
    if (replace) selected.set(coordinateKey, { depth, color: packedColor(model, colorIndex) });
  }
  return new Map([...selected].map(([coordinateKey, value]) => [coordinateKey, value.color]));
}

export function createPatternedBoxGeometry(size: Vec3, model: PackedVoxModel, kind: "floor" | "wall"): BufferGeometry {
  const builder = new GeometryBuilder();
  const [width, height, depth] = size;
  const hx = width / 2;
  const hy = height / 2;
  const hz = depth / 2;
  const fallback = dominantColor(model);

  const wallAlongX = kind === "wall" && width >= depth;
  if (kind === "floor") {
    const top = surfaceMap(model, "top");
    const nx = Math.max(1, Math.min(96, Math.ceil(width)));
    const nz = Math.max(1, Math.min(96, Math.ceil(depth)));
    for (let x = 0; x < nx; x += 1) for (let z = 0; z < nz; z += 1) {
      const x0 = -hx + width * x / nx;
      const x1 = -hx + width * (x + 1) / nx;
      const z0 = -hz + depth * z / nz;
      const z1 = -hz + depth * (z + 1) / nz;
      const color = top.get(`${x % model.size[0]},${z % model.size[1]}`) ?? fallback;
      builder.quad([x0, hy, z1], [x1, hy, z1], [x1, hy, z0], [x0, hy, z0], color);
    }
  } else {
    const length = wallAlongX ? width : depth;
    const horizontalCells = Math.max(1, Math.min(160, Math.ceil(length * 2)));
    const verticalCells = Math.max(1, Math.min(24, Math.ceil(height * 2)));
    const front = surfaceMap(model, "front");
    const back = surfaceMap(model, "back");
    for (let column = 0; column < horizontalCells; column += 1) for (let row = 0; row < verticalCells; row += 1) {
      const p0 = -length / 2 + length * column / horizontalCells;
      const p1 = -length / 2 + length * (column + 1) / horizontalCells;
      const y0 = -hy + height * row / verticalCells;
      const y1 = -hy + height * (row + 1) / verticalCells;
      const sourceX = column % model.size[0];
      const sourceZ = row % model.size[2];
      if (wallAlongX) {
        builder.quad([p0, y0, hz], [p1, y0, hz], [p1, y1, hz], [p0, y1, hz], front.get(`${sourceX},${sourceZ}`) ?? fallback);
        builder.quad([p1, y0, -hz], [p0, y0, -hz], [p0, y1, -hz], [p1, y1, -hz], back.get(`${sourceX},${sourceZ}`) ?? fallback);
      } else {
        builder.quad([hx, y0, p0], [hx, y0, p1], [hx, y1, p1], [hx, y1, p0], front.get(`${sourceX},${sourceZ}`) ?? fallback);
        builder.quad([-hx, y0, p1], [-hx, y0, p0], [-hx, y1, p0], [-hx, y1, p1], back.get(`${sourceX},${sourceZ}`) ?? fallback);
      }
    }
  }

  // Patterned faces are already complete surfaces. Only add the remaining
  // caps here; drawing a fallback quad on the same plane causes Z-fighting.
  builder.quad([-hx, -hy, hz], [-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], fallback);
  if (kind === "wall") {
    builder.quad([-hx, hy, -hz], [-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], fallback);
  }
  if (kind === "floor" || !wallAlongX) {
    builder.quad([-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz], [hx, -hy, -hz], fallback);
    builder.quad([hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz], [-hx, -hy, hz], fallback);
  }
  if (kind === "floor" || wallAlongX) {
    builder.quad([-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz], [-hx, -hy, -hz], fallback);
    builder.quad([hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz], [hx, -hy, hz], fallback);
  }
  return builder.build();
}

export function createDoorVoxelGeometry(size: Vec3, model: PackedVoxModel): BufferGeometry {
  const builder = new GeometryBuilder();
  const occupied = new Set(model.voxels.map(([x, y, z]) => key(x, y, z)));
  const [sourceWidth, sourceDepth, sourceHeight] = model.size;
  const [targetDepth, targetHeight, targetWidth] = size;
  const transform = (x: number, y: number, z: number): Point => [
    y / sourceDepth * targetDepth - targetDepth / 2,
    z / sourceHeight * targetHeight - targetHeight / 2,
    x / sourceWidth * targetWidth - targetWidth / 2,
  ];
  const faces = [
    [[-1, 0, 0], [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]]],
    [[1, 0, 0], [[1, 0, 1], [1, 1, 1], [1, 1, 0], [1, 0, 0]]],
    [[0, -1, 0], [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1]]],
    [[0, 1, 0], [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]]],
    [[0, 0, -1], [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]]],
    [[0, 0, 1], [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]]],
  ] as const;
  for (const [x, y, z, colorIndex] of model.voxels) {
    const color = packedColor(model, colorIndex);
    for (const [normal, corners] of faces) {
      if (occupied.has(key(x + normal[0], y + normal[1], z + normal[2]))) continue;
      const points = corners.map(([dx, dy, dz]) => transform(x + dx, y + dy, z + dz)) as unknown as readonly [Point, Point, Point, Point];
      builder.quad(points[0], points[1], points[2], points[3], color);
    }
  }
  return builder.build();
}
