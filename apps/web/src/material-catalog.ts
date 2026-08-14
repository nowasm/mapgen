import type { DungeonAppearance } from "@mapgen/layout-schema";

import bt1001 from "../../../assets/textures/bricks_and_tiles/Textures_1/001_basecolor.png?url";
import bt1002 from "../../../assets/textures/bricks_and_tiles/Textures_1/002_basecolor.png?url";
import bt1003 from "../../../assets/textures/bricks_and_tiles/Textures_1/003_basecolor.png?url";
import bt1004 from "../../../assets/textures/bricks_and_tiles/Textures_1/004_basecolor.png?url";
import bt1005 from "../../../assets/textures/bricks_and_tiles/Textures_1/005_basecolor.png?url";
import bt2001 from "../../../assets/textures/bricks_and_tiles/Textures_2/001_basecolor.png?url";
import bt2002 from "../../../assets/textures/bricks_and_tiles/Textures_2/002_basecolor.png?url";
import bt2003 from "../../../assets/textures/bricks_and_tiles/Textures_2/003_basecolor.png?url";
import bt2004 from "../../../assets/textures/bricks_and_tiles/Textures_2/004_basecolor.png?url";
import bt2005 from "../../../assets/textures/bricks_and_tiles/Textures_2/005_basecolor.png?url";

export const ORIGINAL_KENNEY_TEXTURE_ID = "kenney-original";
export const FOLLOW_WALL_TEXTURE_ID = "follow-wall";
export const BRICKS_AND_TILES_PACK_ID = "bricks-and-tiles-1.0";

export interface SurfaceTextureOption {
  readonly id: string;
  readonly label: string;
  readonly url?: string;
}

const original: SurfaceTextureOption = { id: ORIGINAL_KENNEY_TEXTURE_ID, label: "Kenney 原始颜色" };

export const WALL_TEXTURE_OPTIONS: readonly SurfaceTextureOption[] = [
  original,
  { id: "bt-2-001", label: "装饰条灰石墙（默认）", url: bt2001 },
  { id: "bt-1-001", label: "冷灰乱石墙", url: bt1001 },
  { id: "bt-1-003", label: "暖棕砖墙", url: bt1003 },
  { id: "bt-2-003", label: "浅暖砖墙", url: bt2003 },
];

export const FLOOR_TEXTURE_OPTIONS: readonly SurfaceTextureOption[] = [
  original,
  { id: "bt-2-002", label: "暖灰八角地砖（默认）", url: bt2002 },
  { id: "bt-1-002", label: "冷灰八角地砖", url: bt1002 },
  { id: "bt-1-004", label: "红色嵌饰地砖", url: bt1004 },
  { id: "bt-1-005", label: "深色嵌饰地砖", url: bt1005 },
  { id: "bt-2-004", label: "蓝色嵌饰地砖", url: bt2004 },
  { id: "bt-2-005", label: "棕色嵌饰地砖", url: bt2005 },
];

export const DOOR_FRAME_TEXTURE_OPTIONS: readonly SurfaceTextureOption[] = [
  { id: FOLLOW_WALL_TEXTURE_ID, label: "跟随墙体纹理（推荐）" },
  ...WALL_TEXTURE_OPTIONS,
];

export const DEFAULT_DUNGEON_APPEARANCE: DungeonAppearance = {
  materialPackId: BRICKS_AND_TILES_PACK_ID,
  wallTextureId: "bt-2-001",
  floorTextureId: "bt-2-002",
  doorFrameTextureId: FOLLOW_WALL_TEXTURE_ID,
  wallCoverageMeters: 2,
  floorCoverageMeters: 2,
  doorFrameCoverageMeters: 2,
};

export function textureOptionById(id: string): SurfaceTextureOption | undefined {
  return [...WALL_TEXTURE_OPTIONS, ...FLOOR_TEXTURE_OPTIONS].find((option) => option.id === id);
}
