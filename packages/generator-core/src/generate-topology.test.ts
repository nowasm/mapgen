import type { ConcreteLayoutMode } from "@mapgen/layout-schema";
import { describe, expect, it } from "vitest";

import { DEFAULT_DUNGEON_PARAMETERS } from "./default-parameters";
import { generateTopology, type TopologyGraph } from "./generate-topology";
import { Mulberry32 } from "./random";
import { resolveDungeonParameters } from "./resolve-parameters";

function graphFor(mode: ConcreteLayoutMode, seed = 42): TopologyGraph {
  const random = new Mulberry32(seed);
  const resolved = resolveDungeonParameters({ ...DEFAULT_DUNGEON_PARAMETERS, mode }, random);
  return generateTopology(resolved, random);
}

function reachableCount(graph: TopologyGraph): number {
  const seen = new Set([graph.entranceId]);
  const queue = [graph.entranceId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of graph.edges.filter(({ from, to }) => from === current || to === current)) {
      const next = edge.from === current ? edge.to : edge.from;
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen.size;
}

describe("multi-room topology generation", () => {
  it("resolves range parameters deterministically", () => {
    const first = resolveDungeonParameters(DEFAULT_DUNGEON_PARAMETERS, new Mulberry32(2026));
    const second = resolveDungeonParameters(DEFAULT_DUNGEON_PARAMETERS, new Mulberry32(2026));

    expect(first).toEqual(second);
    expect(first.roomCount).toBeGreaterThanOrEqual(first.roomCountMin);
    expect(first.roomCount).toBeLessThanOrEqual(first.roomCountMax);
  });

  it("honors a single non-zero Random topology weight", () => {
    const parameters = {
      ...DEFAULT_DUNGEON_PARAMETERS,
      layoutWeights: { hub: 0, ring: 1, branch: 0 },
    };
    for (let seed = 0; seed < 20; seed += 1) {
      expect(resolveDungeonParameters(parameters, new Mulberry32(seed)).topology).toBe("ring");
    }
  });

  it.each(["hub", "ring", "branch"] as const)("creates a connected %s graph on unique orthogonal cells", (mode) => {
    for (let seed = 0; seed < 50; seed += 1) {
      const graph = graphFor(mode, seed);
      const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));

      expect(reachableCount(graph)).toBe(graph.nodes.length);
      expect(new Set(graph.nodes.map(({ x, z }) => `${x},${z}`)).size).toBe(graph.nodes.length);
      expect(graph.exitId).not.toBe(graph.entranceId);
      for (const edge of graph.edges) {
        const from = nodeById.get(edge.from)!;
        const to = nodeById.get(edge.to)!;
        expect(Math.abs(from.x - to.x) + Math.abs(from.z - to.z)).toBe(1);
      }
    }
  });

  it("gives Hub a high-degree center", () => {
    const graph = graphFor("hub");
    const degrees = graph.nodes.map((node) => graph.edges.filter(({ from, to }) => from === node.id || to === node.id).length);
    expect(Math.max(...degrees)).toBeGreaterThanOrEqual(4);
  });

  it("keeps a cycle in Ring", () => {
    const graph = graphFor("ring");
    expect(graph.edges.length).toBeGreaterThanOrEqual(graph.nodes.length);
  });

  it("creates multiple dead ends in Branch", () => {
    const graph = graphFor("branch", 7);
    const deadEnds = graph.nodes.filter((node) => graph.edges.filter(({ from, to }) => from === node.id || to === node.id).length === 1);
    expect(deadEnds.length).toBeGreaterThanOrEqual(2);
  });
});
