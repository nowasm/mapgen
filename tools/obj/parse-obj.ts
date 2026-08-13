export type RgbColor = readonly [number, number, number];

export interface ParsedObj {
  readonly positions: readonly number[];
  readonly colors: readonly number[];
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

function vertexIndex(reference: string, length: number): number {
  const parsed = Number(reference.split("/", 1)[0]);
  if (!Number.isInteger(parsed) || parsed === 0) throw new TypeError(`Invalid OBJ vertex reference: ${reference}`);
  const index = parsed > 0 ? parsed - 1 : length + parsed;
  if (index < 0 || index >= length) throw new RangeError(`OBJ vertex index is out of range: ${reference}`);
  return index;
}

export function parseObj(source: string, materials: ReadonlyMap<string, RgbColor>): ParsedObj {
  const vertices: [number, number, number][] = [];
  const positions: number[] = [];
  const colors: number[] = [];
  const fallback: RgbColor = [180, 180, 180];
  let color = fallback;

  for (const rawLine of source.split(/\r?\n/u)) {
    const [command, ...values] = rawLine.trim().split(/\s+/u);
    if (command === "v" && values.length >= 3) {
      const vertex: [number, number, number] = [Number(values[0]), Number(values[1]), Number(values[2])];
      if (!vertex.every(Number.isFinite)) throw new TypeError(`Invalid OBJ vertex: ${rawLine}`);
      vertices.push(vertex);
    } else if (command === "usemtl") {
      color = materials.get(values.join(" ")) ?? fallback;
    } else if (command === "f" && values.length >= 3) {
      const indices = values.map((reference) => vertexIndex(reference, vertices.length));
      for (let corner = 1; corner + 1 < indices.length; corner += 1) {
        for (const index of [indices[0]!, indices[corner]!, indices[corner + 1]!]) {
          positions.push(...vertices[index]!);
          colors.push(...color);
        }
      }
    }
  }

  if (positions.length === 0) throw new TypeError("OBJ contains no triangle faces");
  const axes = [0, 1, 2] as const;
  const minimum = axes.map((axis) => Math.min(...vertices.map((vertex) => vertex[axis]))) as [number, number, number];
  const maximum = axes.map((axis) => Math.max(...vertices.map((vertex) => vertex[axis]))) as [number, number, number];
  return { positions, colors, bounds: { min: minimum, max: maximum } };
}
