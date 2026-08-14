import { describe, expect, it } from "vitest";

import { dungeonShadowSettings } from "./shadow-settings";

describe("dungeonShadowSettings", () => {
  it("covers the full diagonal of the default 160 metre map", () => {
    const settings = dungeonShadowSettings(160, 160);

    expect(settings.extent).toBe(125);
    expect(settings.extent).toBeGreaterThan(Math.hypot(160, 160) / 2);
    expect(settings.far).toBe(679);
    expect(settings.mapSize).toBe(2048);
    expect(settings.bias).toBe(0);
    expect(settings.normalBias).toBe(0);
    expect(settings.radius).toBe(1);
  });

  it("keeps a safe depth range for the smallest supported map", () => {
    expect(dungeonShadowSettings(16, 16).far).toBe(100);
  });

  it("rejects invalid grid dimensions", () => {
    expect(() => dungeonShadowSettings(0, 160)).toThrow(/positive finite/);
    expect(() => dungeonShadowSettings(Number.NaN, 160)).toThrow(/positive finite/);
  });
});
