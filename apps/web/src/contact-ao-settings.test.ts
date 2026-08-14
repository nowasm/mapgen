import { describe, expect, it } from "vitest";

import { PREVIEW_CONTACT_AO } from "./contact-ao-settings";

describe("preview contact AO settings", () => {
  it("uses a local radius and a non-destructive blend", () => {
    expect(PREVIEW_CONTACT_AO.radius).toBeGreaterThan(0);
    expect(PREVIEW_CONTACT_AO.radius).toBeLessThan(1);
    expect(PREVIEW_CONTACT_AO.blendIntensity).toBeGreaterThan(0);
    expect(PREVIEW_CONTACT_AO.blendIntensity).toBeLessThan(1);
    expect(PREVIEW_CONTACT_AO.samples).toBeGreaterThanOrEqual(8);
  });
});
