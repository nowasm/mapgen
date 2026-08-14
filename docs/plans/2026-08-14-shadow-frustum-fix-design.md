# Preview Shadow Frustum Fix Design

## Problem

The preview enables a shadow-casting `DirectionalLight` but leaves its orthographic shadow camera at the Three.js default of `-5..5`. The generated dungeon can be 160 metres or larger, so only a small region around the map origin receives valid shadow-map coverage. The clipped shadow boundary appears as an unexplained dark patch near the central hub.

Floor-module bounds for the default Seed 104729 were also checked: all 87 floor modules meet only at edges and have no positive-area overlap, ruling out floor Z-fighting as the cause.

## Decision

Keep real-time preview shadows and configure them from the layout grid size:

- Use 55% of the map diagonal as the half extent of the orthographic shadow camera.
- Use a far plane of at least 100 metres and otherwise three times the map diagonal.
- Use a 2048×2048 shadow map.
- Apply a small negative depth bias and positive normal bias to avoid wall-foot shadow acne.
- Use a small PCF radius to soften the result.

After full-map shadows exposed a bright line at wall/floor contacts, geometry bounds confirmed that both surfaces meet at `Y=0` with no meaningful gap. The original `normalBias=0.03` did detach contact shadows, so contact-safe settings now use zero normal bias, zero depth bias, and PCF radius 1.

Further user testing showed that a bright edge remained specifically beside dark, back-facing walls. A zero-bias comparison confirmed that this was not a remaining depth offset. The preview's strong `AmbientLight` is intentionally unshadowed, so a lit floor can remain bright directly beside a dark wall. A local GTAO post-process now supplies view-dependent contact occlusion at wall/floor junctions and corners. This is preferable to globally reducing ambient illumination or adding fake dark geometry strips, and remains preview-only.

The settings live in a pure helper so their coverage can be unit tested without WebGL. This change affects only the editor preview and does not alter generated geometry, collision, texture UVs, layout JSON, or GLB export.

## Verification

- Default 160×160 map shadow extent: `±125 m` instead of the Three.js default `±5 m`.
- Browser inspection at a closer camera distance shows continuous shadows across the whole dungeon and no clipped dark patch in the centre.
- A second close-range inspection after the contact-bias correction shows attached wall-foot shadows, no bright wall/floor seam, and no new shadow acne.
- Browser console: no errors or warnings.
- Full automated tests, TypeScript checks, production build, fixture regeneration, and Godot import smoke test pass.
