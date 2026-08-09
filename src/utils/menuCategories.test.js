import { describe, expect, it } from "vitest";
import { buildCategoryList, categoryKey, categoryName, normalizeCategory } from "./menuCategories";

describe("menu categories", () => {
  it("normalizes object categories and case-insensitive keys", () => {
    expect(categoryName({ name: " Desserts " })).toBe("Desserts");
    expect(categoryKey("DESSERTS")).toBe("desserts");
  });

  it("deduplicates categories while keeping the first display label", () => {
    expect(buildCategoryList([
      { category: "Desserts" },
      { category: "desserts" },
      { category: "All" },
    ])).toEqual(["All", "Desserts"]);
  });

  it("matches imported category casing to an existing label", () => {
    expect(normalizeCategory("house specials", ["All", "House Specials"])).toBe("House Specials");
  });
});
