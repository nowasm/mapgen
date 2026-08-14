export interface DungeonShadowSettings {
  readonly extent: number;
  readonly near: number;
  readonly far: number;
  readonly mapSize: number;
  readonly bias: number;
  readonly normalBias: number;
  readonly radius: number;
}

export function dungeonShadowSettings(width: number, height: number): DungeonShadowSettings {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new RangeError("Dungeon shadow dimensions must be positive finite numbers");
  }
  const diagonal = Math.hypot(width, height);
  return {
    extent: Math.ceil(diagonal * 0.55),
    near: 0.5,
    far: Math.max(100, Math.ceil(diagonal * 3)),
    mapSize: 2048,
    bias: 0,
    normalBias: 0,
    radius: 1,
  };
}
