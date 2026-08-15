import { describe, expect, it } from "vitest";
import { buildCategoryList, categoryKey, categoryName, dishCategoryName, normalizeCategory, resolveDishCategoryNames } from "./menuCategories";

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

describe("resolveDishCategoryNames", () => {
  const catalog = [
    { _id: "64a1f0000000000000000001", name: "Breakfast" },
    { _id: "64a1f0000000000000000002", name: "Starters" },
  ];

  it("attaches categoryName for unpopulated ObjectId categoryId", () => {
    const dishes = [
      { name: "Dosa", categoryId: "64a1f0000000000000000001" },
    ];
    const resolved = resolveDishCategoryNames(dishes, catalog);
    expect(resolved[0].categoryName).toBe("Breakfast");
    expect(dishCategoryName(resolved[0])).toBe("Breakfast");
    // original object untouched
    expect(dishes[0].categoryName).toBeUndefined();
  });

  it("also resolves ids stored in `category`", () => {
    const dishes = [
      { name: "Tikka", category: "64a1f0000000000000000002" },
    ];
    expect(
      dishCategoryName(resolveDishCategoryNames(dishes, catalog)[0]),
    ).toBe("Starters");
  });

  it("leaves dishes with an existing name untouched", () => {
    const dishes = [
      { name: "Dosa", categoryId: { name: "Breakfast" }, categoryName: "Keep" },
    ];
    const resolved = resolveDishCategoryNames(dishes, catalog);
    expect(resolved[0]).toBe(dishes[0]);
  });

  it("passes through when catalog missing or id unknown", () => {
    const dishes = [{ name: "X", categoryId: "64a1f0000000000000000009" }];
    expect(resolveDishCategoryNames(dishes, catalog)[0]).toBe(dishes[0]);
    expect(resolveDishCategoryNames(dishes, [])[0]).toBe(dishes[0]);
    expect(
      resolveDishCategoryNames(dishes, { categories: catalog })[0],
    ).toBe(dishes[0]);
  });

  it("accepts the wrapped `{ categories: [...] }` response shape", () => {
    const dish = { name: "Dosa", categoryId: "64a1f0000000000000000001" };
    expect(
      resolveDishCategoryNames([dish], { categories: catalog })[0]
        .categoryName,
    ).toBe("Breakfast");
  });
});

