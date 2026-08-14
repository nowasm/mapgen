# Surface Texture Controls Design

## Scope

Add a lightweight Base Color material workflow for the downloaded `bricks_and_tiles` CC0 pack. Dungeon layout generation remains unchanged. Users can choose wall and floor appearance independently, adjust the real-world texture coverage size, preview changes immediately, and export the selected appearance inside the GLB.

## Decisions

- Appearance is editor state, independent from generation parameters. Changing a texture never regenerates the ten layout candidates.
- Wall and floor each have a texture selector plus a coverage-size control in metres.
- Door frames have an independent selector and coverage size. The recommended default follows the current wall texture, while the door leaf retains Kenney colours.
- Both selectors include a `Kenney original color` option.
- Default wall: `Textures_2/001_basecolor.png`.
- Default floor: `Textures_2/002_basecolor.png`.
- Door leaves retain the Kenney Building Kit vertex colours. Door frames can follow the wall, use another masonry texture, or retain Kenney colours.
- Version one only uses Base Color. Normal, roughness, height, AO, and emission files remain available for a later PBR extension.
- The GLB embeds the selected image resources. Its paired layout JSON records material pack, selected IDs, and coverage sizes.

## Rendering

The packed Kenney geometry carries palette vertex colours but no reusable tiling UV layout. For textured surfaces, the renderer clones the cached geometry and generates deterministic world-aligned UV coordinates:

- Floors project global X/Z.
- Walls select X/Y or Z/Y projection from the dominant transformed normal.
- UV units are divided by the selected coverage size, so neighbouring modules line up and texture density is stable across differently sized modules.

Untouched surfaces keep the original vertex-colour material. Textured surfaces use a white, non-metallic `MeshStandardMaterial` with the Base Color image map.

## Data Flow

1. `material-catalog.ts` maps stable texture IDs to Vite asset URLs and user-facing labels.
2. The application stores `DungeonAppearance` separately from `GeneratorControls`.
3. The viewport loads the chosen images, builds the scene with texture objects, and rebuilds only the 3D preview when appearance changes.
4. Export loads the same texture objects and passes them to `GLTFExporter`.
5. The paired layout JSON receives the appearance snapshot and the GLB hash.

## Failure Behaviour

If a preview image fails to load, the viewport falls back to Kenney colours for that surface. Export reports an error instead of silently producing a file whose appearance differs from the editor.

## Asset Provenance

The downloaded pack identifies Pavel Kutejnikov as author and CC0/public-domain as its license. The project keeps the original readme files and adds a local source manifest. No third-party texture is modified in place.
