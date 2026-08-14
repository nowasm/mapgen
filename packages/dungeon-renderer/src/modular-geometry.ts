import type { ModuleDefinition, Vec3 } from "@mapgen/layout-schema";
import { BufferGeometry, Float32BufferAttribute } from "three";

import type { PackedObjModel } from "./kenney-visual-pack";

type Point = readonly [number, number, number];
export type WorldUvProjection = "floor" | "wall";

function srgbByteToLinear(value: number): number {
  const normalized = value / 255;
  return normalized < 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

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
  geometry.setAttribute("color", new Float32BufferAttribute(colors.map(srgbByteToLinear), 3));
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

function isFloorTriangle(model: PackedObjModel, triangleOffset: number, maximumHeight: number): boolean {
  const floorTop = model.bounds.min[1] + maximumHeight;
  return [1, 4, 7].every((offset) => model.positions[triangleOffset + offset]! <= floorTop);
}

function appendFloorModel(
  outputPositions: number[],
  outputColors: number[],
  model: PackedObjModel,
  transform: (point: Point) => Point,
  maximumHeight = 0.3,
): void {
  for (let triangleOffset = 0; triangleOffset < model.positions.length; triangleOffset += 9) {
    if (!isFloorTriangle(model, triangleOffset, maximumHeight)) continue;
    for (let vertexOffset = 0; vertexOffset < 9; vertexOffset += 3) {
      const offset = triangleOffset + vertexOffset;
      outputPositions.push(...transform(normalizedPoint(model, offset)));
      outputColors.push(model.colors[offset]!, model.colors[offset + 1]!, model.colors[offset + 2]!);
    }
  }
}

function segmentSizes(total: number, preferred: number): readonly number[] {
  const result: number[] = [];
  let remaining = total;
  while (remaining > 0.000_001) {
    const size = Math.min(preferred, remaining);
    result.push(size);
    remaining -= size;
  }
  return result.length > 0 ? result : [total];
}

function appendRoundedFloorPatch(
  positions: number[],
  colors: number[],
  size: Vec3,
  model: PackedObjModel,
): void {
  const floorColorSamples: number[][] = [];
  const floorTop = model.bounds.min[1] + 0.3;
  for (let offset = 0; offset < model.positions.length; offset += 3) {
    if (model.positions[offset + 1]! <= floorTop) {
      floorColorSamples.push([model.colors[offset]!, model.colors[offset + 1]!, model.colors[offset + 2]!]);
    }
  }
  const color = [0, 1, 2].map((axis) => Math.round(
    floorColorSamples.reduce((sum, sample) => sum + sample[axis]!, 0) / Math.max(1, floorColorSamples.length),
  ));
  const exponent = model.sourceModel.startsWith("room-small") ? 2 : 4;
  const radiusX = Math.max(0.1, size[0] / 2 - 0.65);
  const radiusZ = Math.max(0.1, size[2] / 2 - 0.65);
  const y = -size[1] / 2 + 0.03;
  const segments = 64;
  const point = (index: number): Point => {
    const angle = index / segments * Math.PI * 2;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    return [
      radiusX * Math.sign(cosine) * Math.abs(cosine) ** (2 / exponent),
      y,
      radiusZ * Math.sign(sine) * Math.abs(sine) ** (2 / exponent),
    ];
  };
  for (let index = 0; index < segments; index += 1) {
    positions.push(0, y, 0, ...point(index), ...point(index + 1));
    colors.push(...color, ...color, ...color);
  }
}

export function createTiledFloorGeometry(size: Vec3, model: PackedObjModel, tileSpan = 1): BufferGeometry {
  const [width, height, depth] = size;
  const columnWidths = segmentSizes(width, tileSpan);
  const rowDepths = segmentSizes(depth, tileSpan);
  const positions: number[] = [];
  const colors: number[] = [];
  let cursorX = -width / 2;
  for (const cellWidth of columnWidths) {
    let cursorZ = -depth / 2;
    for (const cellDepth of rowDepths) {
      const centerX = cursorX + cellWidth / 2;
      const centerZ = cursorZ + cellDepth / 2;
      appendModel(positions, colors, model, ([x, y, z]) => [centerX + x * cellWidth, y * height, centerZ + z * cellDepth]);
      cursorZ += cellDepth;
    }
    cursorX += cellWidth;
  }
  return createGeometry(positions, colors);
}

export function createTiledWallGeometry(size: Vec3, model: PackedObjModel, tileSpan = 1): BufferGeometry {
  const [width, height, depth] = size;
  const alongX = width >= depth;
  const length = alongX ? width : depth;
  const cells = segmentSizes(length, tileSpan);
  const positions: number[] = [];
  const colors: number[] = [];
  let cursor = -length / 2;
  for (const cellLength of cells) {
    const center = cursor + cellLength / 2;
    appendModel(positions, colors, model, ([x, y, z]) => alongX
      ? [center + z * cellLength, y * height, x * depth]
      : [x * width, y * height, center + z * cellLength]);
    cursor += cellLength;
  }
  return createGeometry(positions, colors);
}

export function createTiledCorridorGeometry(size: Vec3, model: PackedObjModel, tileSpan: number): BufferGeometry {
  const [width, height, depth] = size;
  const horizontal = width > depth;
  const length = horizontal ? width : depth;
  const crossWidth = horizontal ? depth : width;
  const cells = segmentSizes(length, tileSpan);
  const positions: number[] = [];
  const colors: number[] = [];
  let cursor = -length / 2;
  for (const cellLength of cells) {
    const center = cursor + cellLength / 2;
    appendFloorModel(positions, colors, model, ([x, y, z]) => horizontal
      ? [center + x * cellLength, y * height, z * crossWidth]
      : [z * crossWidth, y * height, center + x * cellLength]);
    cursor += cellLength;
  }
  return createGeometry(positions, colors);
}

export function createRoomFloorGeometry(size: Vec3, model: PackedObjModel): BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  appendRoundedFloorPatch(positions, colors, size, model);
  appendFloorModel(positions, colors, model, ([x, y, z]) => [x * size[0], y * size[1], z * size[2]], 1.1);
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

export function createFittedOverhangGeometry(size: Vec3, model: PackedObjModel): BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const sourceWallHeight = 4.05;
  for (let offset = 0; offset < model.positions.length; offset += 3) {
    const [x, , z] = normalizedPoint(model, offset);
    const y = model.positions[offset + 1]! / sourceWallHeight - 0.5;
    positions.push(z * size[0], y * size[1], x * size[2]);
    colors.push(model.colors[offset]!, model.colors[offset + 1]!, model.colors[offset + 2]!);
  }
  return createGeometry(positions, colors);
}

export function createWorldAlignedUvGeometry(
  source: BufferGeometry,
  module: ModuleDefinition,
  coverageMeters: number,
  projection: WorldUvProjection,
): BufferGeometry {
  if (!Number.isFinite(coverageMeters) || coverageMeters <= 0) {
    throw new RangeError("coverageMeters must be a positive finite number");
  }
  const geometry = source.clone();
  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  const uv = new Float32Array(positions.count * 2);
  const cosine = Math.cos(module.rotationY);
  const sine = Math.sin(module.rotationY);

  for (let index = 0; index < positions.count; index += 1) {
    const localX = positions.getX(index);
    const localZ = positions.getZ(index);
    const worldX = cosine * localX + sine * localZ + module.center[0];
    const worldY = positions.getY(index) + module.center[1];
    const worldZ = -sine * localX + cosine * localZ + module.center[2];
    let u = worldX;
    let v = worldZ;
    if (projection === "wall") {
      const normalX = cosine * normals.getX(index) + sine * normals.getZ(index);
      const normalZ = -sine * normals.getX(index) + cosine * normals.getZ(index);
      u = Math.abs(normalX) > Math.abs(normalZ) ? worldZ : worldX;
      v = worldY;
    }
    uv[index * 2] = u / coverageMeters;
    uv[index * 2 + 1] = v / coverageMeters;
  }

  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  return geometry;
}
