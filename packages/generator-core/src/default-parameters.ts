import type { DungeonParameters } from "@mapgen/layout-schema";

export const DEFAULT_DUNGEON_PARAMETERS: DungeonParameters = {
  width: 160,
  height: 160,
  mode: "random",
  layoutWeights: { hub: 0.33, ring: 0.34, branch: 0.33 },
  largeCellSize: [22, 38],
  roomRate: [0.25, 0.5],
  roomSize: [0.8, 1.2],
  roomMinSize: [10, 14],
  roomMaxSize: [28, 36],
  roomCountMin: [5, 7],
  roomCountMax: [20, 28],
  corridorWidth: [4, 4],
  loopRate: [0.2, 0.4],
  deadEndRate: [0.15, 0.25],
  branchTryMultiplier: [8, 12],
  branchFromProtectedChance: [0.1, 0.3],
  linearWingChance: [0.28, 0.38],
  mirrorXChance: [0.4, 0.6],
  doorOpenRate: [0.2, 0.8],
};
