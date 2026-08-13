import {
  assertDungeonLayout,
  type DungeonLayout,
  type DungeonParameters,
} from "@mapgen/layout-schema";

import { DEFAULT_DUNGEON_PARAMETERS } from "./default-parameters";
import { buildModules } from "./build-modules";
import { generateTopology } from "./generate-topology";
import { placeLayout } from "./place-layout";
import { Mulberry32 } from "./random";
import { resolveDungeonParameters } from "./resolve-parameters";

export interface GenerateDungeonOptions {
  readonly seed: number;
  readonly parameters?: DungeonParameters;
}

const GENERATOR_VERSION = "0.2.0-multi-room";

export function generateDungeon(options: GenerateDungeonOptions): DungeonLayout {
  const parameters = options.parameters ?? DEFAULT_DUNGEON_PARAMETERS;
  const random = new Mulberry32(options.seed);
  const resolvedParameters = resolveDungeonParameters(parameters, random);
  const graph = generateTopology(resolvedParameters, random);
  const placed = placeLayout(graph, resolvedParameters, random);
  const built = buildModules(placed, resolvedParameters);
  const degree = (nodeId: string): number => graph.edges.filter(({ from, to }) => from === nodeId || to === nodeId).length;

  return assertDungeonLayout({
    schemaVersion: 1,
    generatorVersion: GENERATOR_VERSION,
    exportId: `dungeon-${options.seed.toString(16).padStart(8, "0")}-${graph.mode}`,
    seed: options.seed,
    parameters,
    resolvedParameters,
    grid: { width: resolvedParameters.width, height: resolvedParameters.height, cellSize: 1 },
    coordinateSystem: { up: "Y", forward: "-Z", handedness: "right" },
    assetPack: { id: "rpgcobo-dungeon-stone", version: "1" },
    rooms: placed.rooms,
    connections: placed.connections,
    corridors: placed.corridors,
    doors: placed.doors,
    spawn: placed.spawn,
    modules: built.modules,
    colliders: built.colliders,
    diagnostics: {
      warnings: [],
      topology: {
        mode: graph.mode,
        roomCount: graph.nodes.length,
        edgeCount: graph.edges.length,
        loopCount: graph.edges.filter(({ loop }) => loop).length,
        deadEndCount: graph.nodes.filter(({ id }) => degree(id) === 1).length,
        attempts: graph.attempts,
      },
    },
  });
}
