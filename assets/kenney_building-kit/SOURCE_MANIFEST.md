# Source manifest

- Package: Kenney Building Kit
- Local source: `assets/kenney_building-kit`
- License: CC0 1.0 (`License.txt`)
- Runtime conversion: `pnpm assets:build`
- Output: `building-visual-pack.json`
- Conversion: OBJ positions and UVs are read from the original package; the bundled colormap is sampled into vertex colors so exported GLB files are self-contained.

The runtime pack intentionally includes the independent floor, straight wall, column/diagonal/round corner, narrow/wide doorway, door-leaf variation and column modules required by the procedural assembler. Fixed building examples and roof pieces are not used by the single-floor, roofless dungeon generator.
