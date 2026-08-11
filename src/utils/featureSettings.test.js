import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyHotelSettingsUpdate,
  appLevelAllows,
  canUseStaffCapability,
  getFeatureSettings,
  normalizeFeatureSettings,
  persistFeatureSettings,
  featureEnabled,
  getFeaturesForLevel,
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
      godModeEnabled: true,
      staffCapabilities: { editMenu: false, changeOrdering: true },
    });
  });

  it("defaults God Mode on but preserves an explicit restaurant-scoped off value", () => {
    const first = { _id: "hotel-1" };
    const second = { _id: "hotel-2" };
    persistFeatureSettings(first, { godModeEnabled: false });
    expect(getFeatureSettings(first).godModeEnabled).toBe(false);
    expect(getFeatureSettings(second).godModeEnabled).toBe(true);
  });

  it("lets an explicit server value override stale local God Mode state", () => {
    const hotel = { _id: "hotel-1" };
    persistFeatureSettings(hotel, { godModeEnabled: true });
    expect(getFeatureSettings({ ...hotel, featureSettings: { godModeEnabled: false } }).godModeEnabled)
      .toBe(false);
  });

  it("preserves a top-level explicit off value when nested settings are partial", () => {
    expect(getFeatureSettings({
      _id: "hotel-1",
      godModeEnabled: false,
      featureSettings: { appLevel: "advanced" },
    }).godModeEnabled).toBe(false);
  });

  it("applies only restaurant-scoped realtime setting updates", () => {
    const hotel = { _id: "hotel-1", featureSettings: { godModeEnabled: true } };
    expect(applyHotelSettingsUpdate(hotel, {
      hotelId: "hotel-2",
      featureSettings: { godModeEnabled: false },
    })).toBe(hotel);
    expect(applyHotelSettingsUpdate(hotel, {
      hotelId: "hotel-1",
      featureSettings: { godModeEnabled: false },
    }).featureSettings.godModeEnabled).toBe(false);
  });

  it("merges partial realtime capabilities without resetting omitted permissions", () => {
    const hotel = {
      _id: "hotel-1",
      featureSettings: {
        staffCapabilities: { editMenu: false, changeOrdering: false },
      },
    };
    const next = applyHotelSettingsUpdate(hotel, {
      hotelId: "hotel-1",
      featureSettings: { staffCapabilities: { editMenu: true } },
    });

    expect(next.featureSettings.staffCapabilities).toMatchObject({
      editMenu: true,
      changeOrdering: false,
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

  it("makes Advanced a strict superset with several real tools", () => {
    const simple = getFeaturesForLevel("simple").map(({ id }) => id);
    const basic = getFeaturesForLevel("basic").map(({ id }) => id);
    const advanced = getFeaturesForLevel("advanced").map(({ id }) => id);
    expect(simple.every((id) => basic.includes(id))).toBe(true);
    expect(basic.every((id) => advanced.includes(id))).toBe(true);
    expect(getFeaturesForLevel("advanced", { inherited: false })).toHaveLength(5);
    expect(featureEnabled("advanced", "analyticsExport")).toBe(true);
    expect(featureEnabled("basic", "analyticsExport")).toBe(false);
  });
});
