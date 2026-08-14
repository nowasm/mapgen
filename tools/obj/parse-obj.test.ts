import { describe, expect, it } from "vitest";

import { parseMtl, parseObj } from "./parse-obj";

describe("Dungeon Collection OBJ conversion", () => {
  it("reads diffuse material colors", () => {
    const materials = parseMtl("newmtl Stone\nKd 0.25 0.5 0.75\n");

    expect(materials.get("Stone")).toEqual([64, 128, 191]);
  });

  it("triangulates faces and assigns their active material color", () => {
    const obj = [
      "v -1 0 -1",
      "v 1 0 -1",
      "v 1 0 1",
      "v -1 0 1",
      "usemtl Stone",
      "f 1 2 3 4",
    ].join("\n");
    const model = parseObj(obj, new Map([["Stone", [64, 128, 191]]]));

    expect(model.positions).toHaveLength(18);
    expect(model.colors).toEqual(Array.from({ length: 6 }, () => [64, 128, 191]).flat());
    expect(model.bounds).toEqual({ min: [-1, 0, -1], max: [1, 0, 1] });
  });

  it("supports negative OBJ vertex indices", () => {
    const model = parseObj("v 0 0 0\nv 1 0 0\nv 0 1 0\nf -3 -2 -1", new Map());

    expect(model.positions).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  });

  it("preserves face UVs and can select a named OBJ group", () => {
    const obj = [
      "v 0 0 0", "v 1 0 0", "v 0 1 0", "v 2 0 0",
      "vt 0.1 0.2", "vt 0.3 0.4", "vt 0.5 0.6", "vt 0.7 0.8",
      "g frame", "f 1/1 2/2 3/3",
      "g door", "f 2/2 4/4 3/3",
    ].join("\n");
    const model = parseObj(obj, new Map(), { groups: ["door"] });

    expect(model.positions).toEqual([1, 0, 0, 2, 0, 0, 0, 1, 0]);
    expect(model.uvs).toEqual([0.3, 0.4, 0.7, 0.8, 0.5, 0.6]);
    expect(model.bounds).toEqual({ min: [0, 0, 0], max: [2, 1, 0] });
  });
});
