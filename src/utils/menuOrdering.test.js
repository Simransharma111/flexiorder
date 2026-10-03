import { describe, expect, it } from "vitest";
import { sortDishesForDisplay, groupMenuSections } from "./menuOrdering";
import { buildCategoryList } from "./menuCategories";
import { normalizeMenuResponse } from "./menuData";

describe("menu display ordering", () => {
  it("lets a freshly unset catalog position override an older cached dish position", () => {
    expect(buildCategoryList([
      { category: { name: 'Starters', displayOrder: 1 } },
      { category: { name: 'Mains', displayOrder: 2 } },
    ], [{ name: 'Starters', displayOrder: 0 }, { name: 'Mains', displayOrder: 2 }]))
      .toEqual(['All', 'Mains', 'Starters']);
  });
  it("keeps shared subcategories separate and preserves category rank through normalization", () => {
    const dishes = normalizeMenuResponse([
      { _id: 'main', name: 'Curry', category: { name: 'Mains', displayOrder: 2 }, subCategory: 'Veg' },
      { _id: 'starter2', name: 'Soup', displayOrder: 2, category: { name: 'Starters', displayOrder: 1 }, subCategory: 'Veg' },
      { _id: 'starter1', name: 'Salad', displayOrder: 1, category: { name: 'Starters', displayOrder: 1 }, subCategory: 'Veg' },
    ]);
    const categories = buildCategoryList(dishes);
    expect(categories).toEqual(['All', 'Starters', 'Mains']);
    const sections = groupMenuSections(dishes, categories);
    expect(sections.map(s => s.category)).toEqual(['Starters', 'Mains']);
    expect(sections[0].dishes.map(d => d._id)).toEqual(['starter1', 'starter2']);
    expect(groupMenuSections([], categories)).toEqual([]);
  });
  it("puts numbered dishes first and preserves normal dish order", () => {
    const result = sortDishesForDisplay([
      { _id: "normal-1", displayOrder: 0 },
      { _id: "third", displayOrder: 3 },
      { _id: "first", displayOrder: 1 },
      { _id: "normal-2" },
    ]);
    expect(result.map((dish) => dish._id)).toEqual([
      "first",
      "third",
      "normal-1",
      "normal-2",
    ]);
  });
});
