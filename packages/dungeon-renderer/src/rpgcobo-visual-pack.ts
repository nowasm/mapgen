import packJson from "../../../assets/rpgcobo/dungeon-visual-pack.json";

export type PackedColor = readonly [number, number, number, number];
export type PackedVoxel = readonly [number, number, number, number];

export interface PackedVoxModel {
  readonly sourceModel: string;
  readonly size: readonly [number, number, number];
  readonly palette: Readonly<Record<string, PackedColor>>;
  readonly voxels: readonly PackedVoxel[];
}

export interface RpgCoboVisualPack {
  readonly id: string;
  readonly version: number;
  readonly converterVersion: string;
  readonly license: string;
  readonly modified: boolean;
  readonly sources: readonly { readonly path: string; readonly sha256: string }[];
  readonly modules: {
    readonly wall: PackedVoxModel;
    readonly floor: PackedVoxModel;
    readonly doorClosed: PackedVoxModel;
    readonly doorOpen: PackedVoxModel;
  };
}

export const rpgCoboVisualPack = packJson as unknown as RpgCoboVisualPack;

export function packedColor(model: PackedVoxModel, colorIndex: number): PackedColor {
  return model.palette[String(colorIndex)] ?? [255, 0, 255, 255];
}
