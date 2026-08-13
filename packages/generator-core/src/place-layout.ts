import type {
  ConnectionDefinition,
  CorridorDefinition,
  DoorDefinition,
  ResolvedDungeonParameters,
  RoomDefinition,
  Vec3,
} from "@mapgen/layout-schema";

import type { TopologyGraph, TopologyNode } from "./generate-topology";
import { Mulberry32 } from "./random";

export interface PlacedLayout {
  readonly rooms: readonly RoomDefinition[];
  readonly corridors: readonly CorridorDefinition[];
  readonly connections: readonly ConnectionDefinition[];
  readonly doors: readonly DoorDefinition[];
  readonly spawn: { readonly position: Vec3; readonly rotationY: number };
  readonly pitch: number;
}

const WALL_HEIGHT = 2.5;
const MARGIN = 4;

function evenDimension(value: number): number {
  return Math.max(2, Math.floor(value / 2) * 2);
}

export function placeLayout(
  graph: TopologyGraph,
  resolved: ResolvedDungeonParameters,
  random: Mulberry32,
): PlacedLayout {
  const minX = Math.min(...graph.nodes.map(({ x }) => x));
  const maxX = Math.max(...graph.nodes.map(({ x }) => x));
  const minZ = Math.min(...graph.nodes.map(({ z }) => z));
  const maxZ = Math.max(...graph.nodes.map(({ z }) => z));
  const spanX = maxX - minX + 1;
  const spanZ = maxZ - minZ + 1;
  const pitch = Math.floor(Math.min(
    resolved.largeCellSize,
    (resolved.width - MARGIN * 2) / spanX,
    (resolved.height - MARGIN * 2) / spanZ,
  ));
  const maxRoomDimension = evenDimension(Math.max(
    resolved.corridorWidth + 2,
    Math.min(resolved.roomMaxSize * resolved.roomSize, pitch - 2),
  ));
  const minRoomDimension = evenDimension(Math.min(resolved.roomMinSize, maxRoomDimension));
  if (pitch < resolved.corridorWidth + 4 || maxRoomDimension < resolved.corridorWidth + 2) {
    throw new RangeError("selected room count cannot fit inside the map dimensions");
  }

  const usedWidth = spanX * pitch;
  const usedHeight = spanZ * pitch;
  const offsetX = (resolved.width - usedWidth) / 2;
  const offsetZ = (resolved.height - usedHeight) / 2;
  const nodeById = new Map<string, TopologyNode>();
  const roomByNodeId = new Map<string, RoomDefinition>();
  const rooms = graph.nodes.map((node): RoomDefinition => {
    nodeById.set(node.id, node);
    const centerX = offsetX + (node.x - minX + 0.5) * pitch;
    const centerZ = offsetZ + (node.z - minZ + 0.5) * pitch;
    const width = evenDimension(random.integer(minRoomDimension, maxRoomDimension));
    const depth = evenDimension(random.integer(minRoomDimension, maxRoomDimension));
    const kind = node.id === graph.entranceId ? "entrance" : node.id === graph.exitId ? "exit" : "normal";
    const room: RoomDefinition = {
      id: `room-${node.id.slice(5)}`,
      x: centerX - width / 2,
      z: centerZ - depth / 2,
      width,
      depth,
      kind,
    };
    roomByNodeId.set(node.id, room);
    return room;
  });

  const corridors: CorridorDefinition[] = [];
  const connections: ConnectionDefinition[] = [];
  const doors: DoorDefinition[] = [];
  for (const edge of graph.edges) {
    const fromNode = nodeById.get(edge.from)!;
    const toNode = nodeById.get(edge.to)!;
    const fromRoom = roomByNodeId.get(edge.from)!;
    const toRoom = roomByNodeId.get(edge.to)!;
    const horizontal = fromNode.z === toNode.z;
    const firstRoom = horizontal
      ? (fromNode.x < toNode.x ? fromRoom : toRoom)
      : (fromNode.z < toNode.z ? fromRoom : toRoom);
    const secondRoom = firstRoom === fromRoom ? toRoom : fromRoom;
    const corridor: CorridorDefinition = horizontal ? {
      id: `corridor-${edge.id.slice(5)}`,
      x: firstRoom.x + firstRoom.width,
      z: firstRoom.z + firstRoom.depth / 2 - resolved.corridorWidth / 2,
      width: secondRoom.x - (firstRoom.x + firstRoom.width),
      depth: resolved.corridorWidth,
    } : {
      id: `corridor-${edge.id.slice(5)}`,
      x: firstRoom.x + firstRoom.width / 2 - resolved.corridorWidth / 2,
      z: firstRoom.z + firstRoom.depth,
      width: resolved.corridorWidth,
      depth: secondRoom.z - (firstRoom.z + firstRoom.depth),
    };
    if (corridor.width <= 0 || corridor.depth <= 0) {
      throw new RangeError("room dimensions leave no positive corridor span");
    }
    corridors.push(corridor);

    const centerLine = horizontal
      ? corridor.z + corridor.depth / 2 - resolved.height / 2
      : corridor.x + corridor.width / 2 - resolved.width / 2;
    const firstDoor: DoorDefinition = horizontal ? {
      id: `door-${edge.id.slice(5)}-a`,
      position: [corridor.x - resolved.width / 2, WALL_HEIGHT / 2, centerLine],
      rotationY: 0,
      open: random.next() < resolved.doorOpenRate,
    } : {
      id: `door-${edge.id.slice(5)}-a`,
      position: [centerLine, WALL_HEIGHT / 2, corridor.z - resolved.height / 2],
      rotationY: Math.PI / 2,
      open: random.next() < resolved.doorOpenRate,
    };
    const secondDoor: DoorDefinition = horizontal ? {
      ...firstDoor,
      id: `door-${edge.id.slice(5)}-b`,
      position: [corridor.x + corridor.width - resolved.width / 2, WALL_HEIGHT / 2, centerLine],
      open: random.next() < resolved.doorOpenRate,
    } : {
      ...firstDoor,
      id: `door-${edge.id.slice(5)}-b`,
      position: [centerLine, WALL_HEIGHT / 2, corridor.z + corridor.depth - resolved.height / 2],
      open: random.next() < resolved.doorOpenRate,
    };
    doors.push(firstDoor, secondDoor);
    connections.push({
      id: `connection-${edge.id.slice(5)}`,
      fromRoomId: fromRoom.id,
      toRoomId: toRoom.id,
      corridorId: corridor.id,
      doorIds: [firstDoor.id, secondDoor.id],
    });
  }

  const entrance = roomByNodeId.get(graph.entranceId)!;
  return {
    rooms,
    corridors,
    connections,
    doors,
    spawn: {
      position: [
        entrance.x + entrance.width / 2 - resolved.width / 2,
        0.1,
        entrance.z + entrance.depth / 2 - resolved.height / 2,
      ],
      rotationY: 0,
    },
    pitch,
  };
}
