import type { ConcreteLayoutMode, ResolvedDungeonParameters } from "@mapgen/layout-schema";

import { Mulberry32 } from "./random";

export interface TopologyNode {
  readonly id: string;
  x: number;
  z: number;
  protected: boolean;
}

export interface TopologyEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly loop: boolean;
  protected: boolean;
}

export interface TopologyGraph {
  readonly mode: ConcreteLayoutMode;
  readonly nodes: readonly TopologyNode[];
  readonly edges: readonly TopologyEdge[];
  readonly entranceId: string;
  readonly exitId: string;
  readonly attempts: number;
}

type Direction = readonly [number, number];
const DIRECTIONS: readonly Direction[] = [[1, 0], [0, 1], [-1, 0], [0, -1]];

function key(x: number, z: number): string {
  return `${x},${z}`;
}

class GraphBuilder {
  readonly nodes: TopologyNode[] = [];
  readonly edges: TopologyEdge[] = [];
  readonly occupied = new Map<string, TopologyNode>();
  attempts = 0;

  addNode(x: number, z: number): TopologyNode | null {
    this.attempts += 1;
    if (this.occupied.has(key(x, z))) return null;
    const node: TopologyNode = { id: `node-${this.nodes.length}`, x, z, protected: false };
    this.nodes.push(node);
    this.occupied.set(key(x, z), node);
    return node;
  }

  addEdge(from: TopologyNode, to: TopologyNode, loop = false): TopologyEdge {
    const duplicate = this.edges.find((edge) => (
      (edge.from === from.id && edge.to === to.id) ||
      (edge.from === to.id && edge.to === from.id)
    ));
    if (duplicate) return duplicate;
    const edge: TopologyEdge = {
      id: `edge-${this.edges.length}`,
      from: from.id,
      to: to.id,
      loop,
      protected: false,
    };
    this.edges.push(edge);
    return edge;
  }

  degree(node: TopologyNode): number {
    return this.edges.filter((edge) => edge.from === node.id || edge.to === node.id).length;
  }
}

function buildHub(target: number, builder: GraphBuilder): void {
  const center = builder.addNode(0, 0)!;
  const frontier: TopologyNode[] = [];
  for (const [dx, dz] of DIRECTIONS) {
    if (builder.nodes.length >= target) break;
    const tip = builder.addNode(dx, dz)!;
    builder.addEdge(center, tip);
    frontier.push(tip);
  }
  let cursor = 0;
  while (builder.nodes.length < target) {
    const parent = frontier[cursor % frontier.length]!;
    for (const [dx, dz] of DIRECTIONS) {
      if (builder.nodes.length >= target) break;
      const next = builder.addNode(parent.x + dx, parent.z + dz);
      if (next) {
        builder.addEdge(parent, next);
        frontier.push(next);
      }
    }
    cursor += 1;
  }
}

function perimeter(width: number, height: number): readonly [number, number][] {
  const cells: [number, number][] = [];
  for (let x = 0; x < width; x += 1) cells.push([x, 0]);
  for (let z = 1; z < height; z += 1) cells.push([width - 1, z]);
  for (let x = width - 2; x >= 0; x -= 1) cells.push([x, height - 1]);
  for (let z = height - 2; z > 0; z -= 1) cells.push([0, z]);
  return cells;
}

function buildRing(target: number, builder: GraphBuilder, random: Mulberry32): void {
  let width = 2;
  let height = 2;
  for (let candidateWidth = 2; candidateWidth <= target; candidateWidth += 1) {
    for (let candidateHeight = 2; candidateHeight <= target; candidateHeight += 1) {
      const count = 2 * (candidateWidth + candidateHeight) - 4;
      const currentCount = 2 * (width + height) - 4;
      if (
        count <= target &&
        (count > currentCount || (count === currentCount && Math.abs(candidateWidth - candidateHeight) < Math.abs(width - height)))
      ) {
        width = candidateWidth;
        height = candidateHeight;
      }
    }
  }
  const cells = perimeter(width, height);
  const ringNodes = cells.map(([x, z]) => builder.addNode(x, z)!);
  for (let index = 0; index < ringNodes.length; index += 1) {
    builder.addEdge(ringNodes[index]!, ringNodes[(index + 1) % ringNodes.length]!, index === ringNodes.length - 1);
  }
  growBranches(target, builder, random);
}

function growBranches(target: number, builder: GraphBuilder, random: Mulberry32): void {
  let guard = 0;
  while (builder.nodes.length < target && guard < target * 100) {
    guard += 1;
    const candidates = builder.nodes.filter((node) => DIRECTIONS.some(([dx, dz]) => !builder.occupied.has(key(node.x + dx, node.z + dz))));
    const parent = random.pick(candidates);
    const available = DIRECTIONS.filter(([dx, dz]) => !builder.occupied.has(key(parent.x + dx, parent.z + dz)));
    const [dx, dz] = random.pick(available);
    const node = builder.addNode(parent.x + dx, parent.z + dz);
    if (node) builder.addEdge(parent, node);
  }
}

function buildBranch(target: number, builder: GraphBuilder, random: Mulberry32, resolved: ResolvedDungeonParameters): void {
  const center = builder.addNode(0, 0)!;
  center.protected = true;
  for (const [dx, dz] of DIRECTIONS.slice(0, Math.min(3, target - 1))) {
    const node = builder.addNode(dx, dz)!;
    node.protected = true;
    builder.addEdge(center, node);
  }

  let last = builder.nodes[builder.nodes.length - 1]!;
  let lastDirection: Direction = [0, -1];
  const maxAttempts = Math.max(target * Math.max(1, resolved.branchTryMultiplier), target * 4);
  while (builder.nodes.length < target && builder.attempts < maxAttempts) {
    const branchNodes = builder.nodes.filter((node) => builder.degree(node) >= 2);
    const candidates = builder.nodes.filter((node) => DIRECTIONS.some(([dx, dz]) => !builder.occupied.has(key(node.x + dx, node.z + dz))));
    const protectedCandidates = candidates.filter((node) => node.protected);
    let parent = random.next() < resolved.branchFromProtectedChance && protectedCandidates.length > 0
      ? random.pick(protectedCandidates)
      : random.next() < resolved.deadEndRate && branchNodes.length > 0
        ? random.pick(branchNodes)
        : random.pick(candidates);
    let direction = random.pick(DIRECTIONS);
    if (random.next() < resolved.linearWingChance && !builder.occupied.has(key(last.x + lastDirection[0], last.z + lastDirection[1]))) {
      parent = last;
      direction = lastDirection;
    }
    const node = builder.addNode(parent.x + direction[0], parent.z + direction[1]);
    if (node) {
      builder.addEdge(parent, node);
      node.protected = parent.protected && random.next() < resolved.linearWingChance;
      last = node;
      lastDirection = direction;
    }
  }
  growBranches(target, builder, random);
}

function addLoops(builder: GraphBuilder, rate: number, random: Mulberry32): void {
  const candidates: [TopologyNode, TopologyNode][] = [];
  for (const node of builder.nodes) {
    for (const [dx, dz] of [[1, 0], [0, 1]] as const) {
      const neighbor = builder.occupied.get(key(node.x + dx, node.z + dz));
      if (!neighbor) continue;
      const connected = builder.edges.some((edge) => (
        (edge.from === node.id && edge.to === neighbor.id) ||
        (edge.to === node.id && edge.from === neighbor.id)
      ));
      if (!connected) candidates.push([node, neighbor]);
    }
  }
  for (const [from, to] of candidates) {
    if (random.next() < rate) builder.addEdge(from, to, true);
  }
}

function protectMainPath(builder: GraphBuilder): { entranceId: string; exitId: string } {
  const entrance = builder.nodes[0]!;
  const distances = new Map<string, number>([[entrance.id, 0]]);
  const parents = new Map<string, { nodeId: string; edge: TopologyEdge }>();
  const queue = [entrance];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of builder.edges.filter((item) => item.from === current.id || item.to === current.id)) {
      const nextId = edge.from === current.id ? edge.to : edge.from;
      if (distances.has(nextId)) continue;
      distances.set(nextId, distances.get(current.id)! + 1);
      parents.set(nextId, { nodeId: current.id, edge });
      queue.push(builder.nodes.find((node) => node.id === nextId)!);
    }
  }
  const exit = [...builder.nodes].sort((a, b) => distances.get(b.id)! - distances.get(a.id)!)[0]!;
  let cursor = exit;
  cursor.protected = true;
  entrance.protected = true;
  while (cursor.id !== entrance.id) {
    const parent = parents.get(cursor.id)!;
    parent.edge.protected = true;
    cursor = builder.nodes.find((node) => node.id === parent.nodeId)!;
    cursor.protected = true;
  }
  return { entranceId: entrance.id, exitId: exit.id };
}

export function generateTopology(resolved: ResolvedDungeonParameters, random: Mulberry32): TopologyGraph {
  const builder = new GraphBuilder();
  if (resolved.topology === "hub") buildHub(resolved.roomCount, builder);
  else if (resolved.topology === "ring") buildRing(resolved.roomCount, builder, random);
  else buildBranch(resolved.roomCount, builder, random, resolved);

  addLoops(builder, resolved.loopRate, random);
  if (random.next() < resolved.mirrorXChance) {
    for (const node of builder.nodes) node.x *= -1;
  }
  const endpoints = protectMainPath(builder);
  return {
    mode: resolved.topology,
    nodes: builder.nodes,
    edges: builder.edges,
    ...endpoints,
    attempts: builder.attempts,
  };
}
