import type { DungeonTextureSet } from "@mapgen/dungeon-renderer";
import type { DungeonAppearance } from "@mapgen/layout-schema";
import { RepeatWrapping, SRGBColorSpace, Texture, TextureLoader } from "three";

import { FOLLOW_WALL_TEXTURE_ID, ORIGINAL_KENNEY_TEXTURE_ID, textureOptionById } from "./material-catalog";

const texturePromises = new Map<string, Promise<Texture>>();

function loadTexture(id: string): Promise<Texture | undefined> {
  if (id === ORIGINAL_KENNEY_TEXTURE_ID) return Promise.resolve(undefined);
  const option = textureOptionById(id);
  if (!option?.url) return Promise.reject(new Error(`Unknown surface texture: ${id}`));
  let pending = texturePromises.get(id);
  if (!pending) {
    pending = new TextureLoader().loadAsync(option.url).then((texture) => {
      texture.name = id;
      texture.colorSpace = SRGBColorSpace;
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      texture.needsUpdate = true;
      return texture;
    });
    texturePromises.set(id, pending);
  }
  return pending;
}

export async function loadAppearanceTextures(appearance: DungeonAppearance): Promise<DungeonTextureSet> {
  const doorFrameTextureId = appearance.doorFrameTextureId === FOLLOW_WALL_TEXTURE_ID || appearance.doorFrameTextureId === undefined
    ? appearance.wallTextureId
    : appearance.doorFrameTextureId;
  const [wall, floor, doorFrame] = await Promise.all([
    loadTexture(appearance.wallTextureId),
    loadTexture(appearance.floorTextureId),
    loadTexture(doorFrameTextureId),
  ]);
  return {
    ...(wall ? { wall } : {}),
    ...(floor ? { floor } : {}),
    ...(doorFrame ? { doorFrame } : {}),
  };
}
