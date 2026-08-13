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
});
