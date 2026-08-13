import packJson from "../../../assets/dungeon_collection_2/dungeon-visual-pack.json";

export interface PackedObjModel {
  readonly sourceModel: string;
  readonly positions: readonly number[];
  readonly colors: readonly number[];
  readonly bounds: {
    readonly min: readonly [number, number, number];
    readonly max: readonly [number, number, number];
  };
}

export interface DungeonCollection2Pack {
  readonly id: string;
  readonly version: number;
  readonly converterVersion: string;
  readonly license: string;
  readonly modified: boolean;
  readonly sources: readonly { readonly path: string; readonly sha256: string }[];
  readonly modules: {
    readonly floor: PackedObjModel;
    readonly wall: PackedObjModel;
    readonly frame: PackedObjModel;
    readonly doorClosed: PackedObjModel;
    readonly doorOpen: PackedObjModel;
  };
}

export const dungeonCollection2Pack = packJson as unknown as DungeonCollection2Pack;
