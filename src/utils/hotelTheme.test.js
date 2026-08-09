import { describe, expect, it } from "vitest";
import { getHotelThemeStyle, resolveHotelTheme } from "./hotelTheme";

describe("hotel theme", () => {
  it("uses the preset accent as the interactive color", () => {
    const style = getHotelThemeStyle({ theme: { id: "lavender_hues" } });
    expect(style["--primary"]).toBe("#a78bfa");
    expect(style["--theme-surface"]).toBe("#ffffff");
  });

  it("supports custom and legacy saved theme fields", () => {
    const theme = resolveHotelTheme({
      theme: {
        themeId: "skywave",
        primaryColor: "#fafafa",
        secondaryColor: "#eeeeee",
        accentColor: "#123456",
      },
    });
    expect(theme).toMatchObject({
      id: "skywave",
      primary: "#fafafa",
      secondary: "#eeeeee",
      accent: "#123456",
    });
  });

  it("falls back safely when saved colors are malformed", () => {
    const theme = resolveHotelTheme({ theme: { id: "mint_glow", accent: "green" } });
    expect(theme.accent).toBe("#34d399");
  });

  it("keeps older themes that stored only a primary brand color", () => {
    const style = getHotelThemeStyle({ theme: { primary: "#f97316" } });
    expect(style["--primary"]).toBe("#f97316");
  });

  it("preserves the primary brand color for legacy theme ids", () => {
    const style = getHotelThemeStyle({ theme: { id: "velvet_sunset" } });
    expect(style["--primary"]).toBe("#F97316");
  });

  it("chooses the higher-contrast foreground for light accents", () => {
    const style = getHotelThemeStyle({ theme: { id: "skywave" } });
    expect(style["--theme-on-primary"]).toBe("#17201d");
  });
});
