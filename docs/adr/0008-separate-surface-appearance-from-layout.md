# ADR 0008: Separate Surface Appearance from Layout Generation

## Status

Accepted

## Context

Wall and floor textures affect presentation, not room placement, corridor connectivity, collision, or doors. Re-running procedural generation when a texture changes would discard a selected candidate and make visual iteration slow.

The final deliverable is imported into Godot as GLB, so the chosen appearance must still be reproducible and travel with the exported model.

## Decision

Keep appearance as independent editor state. The renderer receives an appearance snapshot and loaded texture objects. Changing appearance rebuilds the preview scene only.

Add an optional `appearance` property to paired layout JSON. The export process snapshots current appearance into this property and embeds selected Base Color images in the GLB. Layout schema version remains 1 because this is an optional additive field.

Use generated world-aligned UVs for floor and wall modules. Doors and frames remain on Kenney vertex colours.

## Consequences

- Users can iterate on material choices without changing layout seeds or candidates.
- Exported GLB and JSON describe the same visual result.
- Version one is intentionally non-PBR beyond a standard rough, non-metallic material.
- World-aligned box projection may show seams at projection boundaries on curved details; this is accepted for a modular dungeon viewed from a third-person oblique camera.
