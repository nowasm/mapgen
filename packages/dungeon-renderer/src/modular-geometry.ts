import type { Vec3 } from "@mapgen/layout-schema";
import { BufferGeometry, Float32BufferAttribute } from "three";

import type { PackedObjModel } from "./dungeon-collection-2-pack";

type Point = readonly [number, number, number];

function normalizedPoint(model: PackedObjModel, offset: number): Point {
  const axes = [0, 1, 2] as const;
  return axes.map((axis) => {
    const minimum = model.bounds.min[axis];
    const extent = model.bounds.max[axis] - minimum;
    return extent === 0 ? 0 : (model.positions[offset + axis]! - minimum) / extent - 0.5;
  }) as unknown as Point;
}

function createGeometry(positions: readonly number[], colors: readonly number[]): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors.map((value) => value / 255), 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function appendModel(
  outputPositions: number[],
  outputColors: number[],
  model: PackedObjModel,
  transform: (point: Point) => Point,
): void {
  for (let offset = 0; offset < model.positions.length; offset += 3) {
    outputPositions.push(...transform(normalizedPoint(model, offset)));
    outputColors.push(model.colors[offset]!, model.colors[offset + 1]!, model.colors[offset + 2]!);
  }
}

export function createTiledFloorGeometry(size: Vec3, model: PackedObjModel): BufferGeometry {
  const [width, height, depth] = size;
  const columns = Math.max(1, Math.ceil(width));
  const rows = Math.max(1, Math.ceil(depth));
  const cellWidth = width / columns;
  const cellDepth = depth / rows;
  const positions: number[] = [];
  const colors: number[] = [];
  for (let column = 0; column < columns; column += 1) for (let row = 0; row < rows; row += 1) {
    const centerX = -width / 2 + (column + 0.5) * cellWidth;
    const centerZ = -depth / 2 + (row + 0.5) * cellDepth;
    appendModel(positions, colors, model, ([x, y, z]) => [centerX + x * cellWidth, y * height, centerZ + z * cellDepth]);
  }
  return createGeometry(positions, colors);
}

export function createTiledWallGeometry(size: Vec3, model: PackedObjModel): BufferGeometry {
  const [width, height, depth] = size;
  const alongX = width >= depth;
  const length = alongX ? width : depth;
  const columns = Math.max(1, Math.ceil(length));
  const rows = Math.max(1, Math.ceil(height));
  const cellLength = length / columns;
  const cellHeight = height / rows;
  const positions: number[] = [];
  const colors: number[] = [];
  for (let column = 0; column < columns; column += 1) for (let row = 0; row < rows; row += 1) {
    const center = -length / 2 + (column + 0.5) * cellLength;
    const centerY = -height / 2 + (row + 0.5) * cellHeight;
    appendModel(positions, colors, model, ([x, y, z]) => alongX
      ? [center + x * cellLength, centerY + y * cellHeight, z * depth]
      : [z * width, centerY + y * cellHeight, center + x * cellLength]);
  }
  return createGeometry(positions, colors);
}

export function createFittedGeometry(
  size: Vec3,
  model: PackedObjModel,
  swapWidthAndDepth = false,
): BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  appendModel(positions, colors, model, ([x, y, z]) => swapWidthAndDepth
    ? [z * size[0], y * size[1], x * size[2]]
    : [x * size[0], y * size[1], z * size[2]]);
  return createGeometry(positions, colors);
}
