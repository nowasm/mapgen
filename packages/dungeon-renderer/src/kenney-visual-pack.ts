import packJson from "../../../assets/kenney_building-kit/building-visual-pack.json";

export interface PackedObjModel {
  readonly sourceModel: string;
  readonly positions: readonly number[];
  readonly colors: readonly number[];
  readonly bounds: {
    readonly min: readonly [number, number, number];
    readonly max: readonly [number, number, number];
  };
}

export interface KenneyVisualPack {
  readonly id: string;
  readonly version: number;
  readonly converterVersion: string;
  readonly license: string;
  readonly modified: boolean;
  readonly sources: readonly { readonly path: string; readonly sha256: string }[];
  readonly modules: {
    readonly floor: PackedObjModel;
    readonly floorHalf: PackedObjModel;
    readonly floorQuarter: PackedObjModel;
    readonly floorCornerDiagonal: PackedObjModel;
    readonly floorCornerRound: PackedObjModel;
    readonly wall: PackedObjModel;
    readonly wallHalf: PackedObjModel;
    readonly wallCorner: PackedObjModel;
    readonly wallCornerColumn: PackedObjModel;
    readonly wallCornerDiagonal: PackedObjModel;
    readonly wallCornerRound: PackedObjModel;
    readonly frameSquare: PackedObjModel;
    readonly frameRound: PackedObjModel;
    readonly frameWideSquare: PackedObjModel;
    readonly frameWideRound: PackedObjModel;
    readonly doorSquareA: PackedObjModel;
    readonly doorSquareB: PackedObjModel;
    readonly doorSquareC: PackedObjModel;
    readonly doorSquareD: PackedObjModel;
    readonly doorRoundA: PackedObjModel;
    readonly doorRoundB: PackedObjModel;
    readonly doorRoundC: PackedObjModel;
    readonly doorRoundD: PackedObjModel;
    readonly column: PackedObjModel;
    readonly columnThin: PackedObjModel;
  };
}

export const kenneyVisualPack = packJson as unknown as KenneyVisualPack;
