import type {
  ConcreteLayoutMode,
  DungeonParameters,
  NumericRange,
  ResolvedDungeonParameters,
} from "@mapgen/layout-schema";

import { Mulberry32 } from "./random";

function resolveFloat(range: NumericRange, random: Mulberry32): number {
  return random.float(range[0], range[1]);
}

function resolveInteger(range: NumericRange, random: Mulberry32): number {
  return random.integer(Math.ceil(range[0]), Math.floor(range[1]));
}

function resolveTopology(parameters: DungeonParameters, random: Mulberry32): ConcreteLayoutMode {
  if (parameters.mode !== "random") return parameters.mode;
  return random.weightedPick([
    ["hub", parameters.layoutWeights.hub],
    ["ring", parameters.layoutWeights.ring],
    ["branch", parameters.layoutWeights.branch],
  ] as const);
}

export function resolveDungeonParameters(
  parameters: DungeonParameters,
  random: Mulberry32,
): ResolvedDungeonParameters {
  const topology = resolveTopology(parameters, random);
  const roomRate = resolveFloat(parameters.roomRate, random);
  const roomCountMin = resolveInteger(parameters.roomCountMin, random);
  const roomCountMax = Math.max(roomCountMin, resolveInteger(parameters.roomCountMax, random));
  const roomCount = Math.max(
    roomCountMin,
    Math.min(roomCountMax, Math.round(roomCountMax * roomRate)),
  );
  const roomMinSize = resolveInteger(parameters.roomMinSize, random);
  const roomMaxSize = Math.max(roomMinSize, resolveInteger(parameters.roomMaxSize, random));

  return {
    width: parameters.width,
    height: parameters.height,
    topology,
    largeCellSize: resolveInteger(parameters.largeCellSize, random),
    roomRate,
    roomSize: resolveFloat(parameters.roomSize, random),
    roomMinSize,
    roomMaxSize,
    roomCountMin,
    roomCountMax,
    roomCount,
    corridorWidth: resolveInteger(parameters.corridorWidth, random),
    loopRate: resolveFloat(parameters.loopRate, random),
    deadEndRate: resolveFloat(parameters.deadEndRate, random),
    branchTryMultiplier: resolveInteger(parameters.branchTryMultiplier, random),
    branchFromProtectedChance: resolveFloat(parameters.branchFromProtectedChance, random),
    linearWingChance: resolveFloat(parameters.linearWingChance, random),
    mirrorXChance: resolveFloat(parameters.mirrorXChance, random),
    doorOpenRate: resolveFloat(parameters.doorOpenRate, random),
    roomCornerStyle: parameters.roomCornerStyle,
    roomVariationRate: resolveFloat(parameters.roomVariationRate, random),
    floorVariationRate: resolveFloat(parameters.floorVariationRate, random),
    wallVariationRate: resolveFloat(parameters.wallVariationRate, random),
  };
}
