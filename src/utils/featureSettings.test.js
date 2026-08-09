import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  appLevelAllows,
  canUseStaffCapability,
  getFeatureSettings,
  normalizeFeatureSettings,
  persistFeatureSettings,
} from "./featureSettings";

const storage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
};

describe("feature settings", () => {
  beforeEach(() => vi.stubGlobal("localStorage", storage()));
  afterEach(() => vi.unstubAllGlobals());

  it("uses a safe basic default and merges capability switches", () => {
    expect(normalizeFeatureSettings({ staffCapabilities: { editMenu: false } })).toMatchObject({
      appLevel: "basic",
      staffCapabilities: { editMenu: false, changeOrdering: true },
    });
  });

  it("persists settings per restaurant instead of per staff account", () => {
    const hotel = { _id: "hotel-1" };
    persistFeatureSettings(hotel, { appLevel: "advanced", publicDisplayEnabled: true });
    expect(getFeatureSettings(hotel)).toMatchObject({ appLevel: "advanced", publicDisplayEnabled: true });
  });

  it("keeps owners capable while respecting staff switches", () => {
    const hotel = { _id: "hotel-1", featureSettings: { staffCapabilities: { editMenu: false } } };
    expect(canUseStaffCapability(hotel, "editMenu", "staff")).toBe(false);
    expect(canUseStaffCapability(hotel, "editMenu", "owner")).toBe(true);
  });

  it("keeps workspace switching core but gates optional staff tools by app level", () => {
    const hotel = { _id: "hotel-1", featureSettings: { appLevel: "simple" } };
    expect(canUseStaffCapability(hotel, "switchWorkspaces", "staff")).toBe(true);
    expect(canUseStaffCapability(hotel, "editMenu", "staff")).toBe(false);
    expect(canUseStaffCapability(hotel, "changeOrdering", "staff")).toBe(false);
    expect(canUseStaffCapability(hotel, "usePublicDisplay", "staff")).toBe(false);
  });

  it("orders progressive levels", () => {
    expect(appLevelAllows("simple", "basic")).toBe(false);
    expect(appLevelAllows("advanced", "basic")).toBe(true);
  });
});
