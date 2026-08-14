export type RgbColor = readonly [number, number, number];

export interface ParsedObj {
  readonly positions: readonly number[];
  readonly colors: readonly number[];
  readonly uvs: readonly number[];
  readonly bounds: {
    readonly min: readonly [number, number, number];
    readonly max: readonly [number, number, number];
  };
}

function byte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value * 255)));
}

export function parseMtl(source: string): ReadonlyMap<string, RgbColor> {
  const materials = new Map<string, RgbColor>();
  let current: string | undefined;
  for (const rawLine of source.split(/\r?\n/u)) {
    const [command, ...values] = rawLine.trim().split(/\s+/u);
    if (command === "newmtl") current = values.join(" ");
    else if (command === "Kd" && current && values.length >= 3) {
      materials.set(current, [byte(Number(values[0])), byte(Number(values[1])), byte(Number(values[2]))]);
    }
  }
  return materials;
}

export interface ParseObjOptions {
  readonly groups?: readonly string[];
}

function referenceIndex(reference: string, component: number, length: number): number | undefined {
  const value = reference.split("/")[component];
  if (value === undefined || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed === 0) throw new TypeError(`Invalid OBJ vertex reference: ${reference}`);
  const index = parsed > 0 ? parsed - 1 : length + parsed;
  if (index < 0 || index >= length) throw new RangeError(`OBJ vertex index is out of range: ${reference}`);
  return index;
}

export function parseObj(
  source: string,
  materials: ReadonlyMap<string, RgbColor>,
  options: ParseObjOptions = {},
): ParsedObj {
  const vertices: [number, number, number][] = [];
  const textureCoordinates: [number, number][] = [];
  const positions: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const fallback: RgbColor = [180, 180, 180];
  let color = fallback;
  let group = "default";
  const selectedGroups = new Set(options.groups ?? []);

  for (const rawLine of source.split(/\r?\n/u)) {
    const [command, ...values] = rawLine.trim().split(/\s+/u);
    if (command === "v" && values.length >= 3) {
      const vertex: [number, number, number] = [Number(values[0]), Number(values[1]), Number(values[2])];
      if (!vertex.every(Number.isFinite)) throw new TypeError(`Invalid OBJ vertex: ${rawLine}`);
      vertices.push(vertex);
    } else if (command === "vt" && values.length >= 2) {
      textureCoordinates.push([Number(values[0]), Number(values[1])]);
    } else if (command === "g") {
      group = values.join(" ");
    } else if (command === "usemtl") {
      color = materials.get(values.join(" ")) ?? fallback;
    } else if (command === "f" && values.length >= 3 && (selectedGroups.size === 0 || selectedGroups.has(group))) {
      for (let corner = 1; corner + 1 < values.length; corner += 1) {
        for (const reference of [values[0]!, values[corner]!, values[corner + 1]!]) {
          const vertex = referenceIndex(reference, 0, vertices.length);
          const textureCoordinate = referenceIndex(reference, 1, textureCoordinates.length);
          if (vertex === undefined) throw new TypeError(`OBJ face lacks a vertex: ${reference}`);
          positions.push(...vertices[vertex]!);
          uvs.push(...(textureCoordinate === undefined ? [0, 0] : textureCoordinates[textureCoordinate]!));
          colors.push(...color);
        }
      }
    }
  }

  if (positions.length === 0) throw new TypeError("OBJ contains no triangle faces");
  const vertexCount = positions.length / 3;
  const axes = [0, 1, 2] as const;
  const minimum = axes.map((axis) => Math.min(...Array.from({ length: vertexCount }, (_, index) => positions[index * 3 + axis]!))) as [number, number, number];
  const maximum = axes.map((axis) => Math.max(...Array.from({ length: vertexCount }, (_, index) => positions[index * 3 + axis]!))) as [number, number, number];
  return { positions, colors, uvs, bounds: { min: minimum, max: maximum } };
}
