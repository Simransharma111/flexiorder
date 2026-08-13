import { describe, expect, it } from "vitest";
import { buildCategoryList, categoryKey, categoryName, dishCategoryName, normalizeCategory } from "./menuCategories";

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

  it("never exposes a database id as category text", () => {
    const id = "6a7d865d30af0144c44a9063";
    expect(categoryName(id)).toBe("");
    expect(dishCategoryName({ categoryId: id })).toBe("");
    expect(buildCategoryList([{ categoryId: id }])).toEqual(["All"]);
  });

  it("prefers a populated category name over its flattened id", () => {
    expect(dishCategoryName({
      categoryId: { _id: "6a7d865d30af0144c44a9063", name: "Starters" },
      category: "6a7d865d30af0144c44a9063",
    })).toBe("Starters");
  });
});
