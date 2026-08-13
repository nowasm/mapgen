export interface VoxVoxel {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly colorIndex: number;
}

export interface VoxModel {
  readonly id: number;
  readonly name?: string;
  readonly size: readonly [number, number, number];
  readonly voxels: readonly VoxVoxel[];
}

export interface ParsedVox {
  readonly version: number;
  readonly models: readonly VoxModel[];
  readonly palette: readonly (readonly [number, number, number, number])[];
}

const MAX_FILE_BYTES = 32 * 1024 * 1024;
const MAX_MODELS = 4_096;
const MAX_VOXELS = 4_000_000;

class Reader {
  offset = 0;
  constructor(readonly bytes: Uint8Array, readonly end = bytes.byteLength) {}

  ensure(length: number): void {
    if (length < 0 || this.offset + length > this.end) throw new RangeError("VOX chunk exceeds file bounds");
  }

  u32(): number {
    this.ensure(4);
    const value = new DataView(this.bytes.buffer, this.bytes.byteOffset, this.bytes.byteLength).getUint32(this.offset, true);
    this.offset += 4;
    return value;
  }

  i32(): number {
    this.ensure(4);
    const value = new DataView(this.bytes.buffer, this.bytes.byteOffset, this.bytes.byteLength).getInt32(this.offset, true);
    this.offset += 4;
    return value;
  }

  ascii(length: number): string {
    this.ensure(length);
    const value = String.fromCharCode(...this.bytes.subarray(this.offset, this.offset + length));
    this.offset += length;
    return value;
  }

  string(): string {
    const length = this.u32();
    if (length > 1_048_576) throw new RangeError("VOX string is too large");
    this.ensure(length);
    const value = new TextDecoder().decode(this.bytes.subarray(this.offset, this.offset + length));
    this.offset += length;
    return value;
  }

  dictionary(): Readonly<Record<string, string>> {
    const count = this.u32();
    if (count > 65_536) throw new RangeError("VOX dictionary is too large");
    const result: Record<string, string> = {};
    for (let index = 0; index < count; index += 1) result[this.string()] = this.string();
    return result;
  }
}

interface TransformNode { readonly childId: number; readonly name?: string }
interface GroupNode { readonly childIds: readonly number[] }
interface ShapeNode { readonly modelIds: readonly number[] }

export function parseVox(bytes: Uint8Array): ParsedVox {
  if (bytes.byteLength < 20 || bytes.byteLength > MAX_FILE_BYTES) throw new RangeError("VOX file size is invalid");
  const reader = new Reader(bytes);
  if (reader.ascii(4) !== "VOX ") throw new TypeError("VOX magic is missing");
  const version = reader.u32();
  if (version !== 200) throw new TypeError(`Unsupported VOX version: ${version}`);
  if (reader.ascii(4) !== "MAIN") throw new TypeError("VOX MAIN chunk is missing");
  const mainContent = reader.u32();
  const mainChildren = reader.u32();
  if (mainContent !== 0 || reader.offset + mainChildren !== bytes.byteLength) throw new RangeError("VOX MAIN bounds are invalid");

  const models: { size?: readonly [number, number, number]; voxels?: readonly VoxVoxel[] }[] = [];
  const transforms = new Map<number, TransformNode>();
  const groups = new Map<number, GroupNode>();
  const shapes = new Map<number, ShapeNode>();
  let palette: (readonly [number, number, number, number])[] | undefined;
  let currentSize: readonly [number, number, number] | undefined;
  const end = bytes.byteLength;

  while (reader.offset < end) {
    const id = reader.ascii(4);
    const contentSize = reader.u32();
    const childrenSize = reader.u32();
    const contentEnd = reader.offset + contentSize;
    const chunkEnd = contentEnd + childrenSize;
    if (contentEnd > end || chunkEnd > end) throw new RangeError(`VOX ${id} chunk exceeds file bounds`);

    if (id === "SIZE") {
      currentSize = [reader.u32(), reader.u32(), reader.u32()];
    } else if (id === "XYZI") {
      if (!currentSize) throw new TypeError("VOX XYZI appears before SIZE");
      const count = reader.u32();
      if (count > MAX_VOXELS || reader.offset + count * 4 > contentEnd) throw new RangeError("VOX voxel count is invalid");
      const voxels: VoxVoxel[] = [];
      for (let index = 0; index < count; index += 1) {
        voxels.push({ x: bytes[reader.offset]!, y: bytes[reader.offset + 1]!, z: bytes[reader.offset + 2]!, colorIndex: bytes[reader.offset + 3]! });
        reader.offset += 4;
      }
      models.push({ size: currentSize, voxels });
      currentSize = undefined;
      if (models.length > MAX_MODELS) throw new RangeError("VOX model count exceeds safety limit");
    } else if (id === "RGBA") {
      if (contentSize !== 1_024) throw new RangeError("VOX RGBA chunk must contain 256 colors");
      palette = [];
      for (let index = 0; index < 256; index += 1) {
        palette.push([bytes[reader.offset]!, bytes[reader.offset + 1]!, bytes[reader.offset + 2]!, bytes[reader.offset + 3]!]);
        reader.offset += 4;
      }
    } else if (id === "nTRN") {
      const nodeId = reader.i32();
      const attributes = reader.dictionary();
      const childId = reader.i32();
      reader.i32();
      reader.i32();
      const frameCount = reader.u32();
      for (let index = 0; index < frameCount; index += 1) reader.dictionary();
      transforms.set(nodeId, { childId, ...(attributes._name ? { name: attributes._name } : {}) });
    } else if (id === "nGRP") {
      const nodeId = reader.i32();
      reader.dictionary();
      const childCount = reader.u32();
      if (childCount > MAX_MODELS * 4) throw new RangeError("VOX group is too large");
      const childIds: number[] = [];
      for (let index = 0; index < childCount; index += 1) childIds.push(reader.i32());
      groups.set(nodeId, { childIds });
    } else if (id === "nSHP") {
      const nodeId = reader.i32();
      reader.dictionary();
      const modelCount = reader.u32();
      if (modelCount > MAX_MODELS) throw new RangeError("VOX shape is too large");
      const modelIds: number[] = [];
      for (let index = 0; index < modelCount; index += 1) {
        modelIds.push(reader.i32());
        reader.dictionary();
      }
      shapes.set(nodeId, { modelIds });
    }
    reader.offset = chunkEnd;
  }

  if (!palette) throw new TypeError("VOX RGBA palette is required");
  const names = new Map<number, string>();
  const collect = (nodeId: number, inheritedName?: string, visited = new Set<number>()): void => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const transform = transforms.get(nodeId);
    if (transform) {
      const qualifiedName = transform.name
        ? (inheritedName ? `${inheritedName}/${transform.name}` : transform.name)
        : inheritedName;
      collect(transform.childId, qualifiedName, visited);
      return;
    }
    const group = groups.get(nodeId);
    if (group) {
      for (const childId of group.childIds) collect(childId, inheritedName, new Set(visited));
      return;
    }
    const shape = shapes.get(nodeId);
    if (shape && inheritedName) for (const modelId of shape.modelIds) if (!names.has(modelId)) names.set(modelId, inheritedName);
  };
  const referencedNodes = new Set<number>();
  for (const transform of transforms.values()) referencedNodes.add(transform.childId);
  for (const group of groups.values()) for (const childId of group.childIds) referencedNodes.add(childId);
  for (const nodeId of transforms.keys()) if (!referencedNodes.has(nodeId)) collect(nodeId);

  return {
    version,
    palette,
    models: models.map((model, id) => {
      if (!model.size || !model.voxels) throw new TypeError(`VOX model ${id} is incomplete`);
      const name = names.get(id);
      return { id, ...(name ? { name } : {}), size: model.size, voxels: model.voxels };
    }),
  };
}

export function findNamedVoxModel(parsed: ParsedVox, name: string): VoxModel {
  const model = parsed.models.find((candidate) => candidate.name === name);
  if (!model) throw new RangeError(`VOX model not found: ${name}`);
  return model;
}
