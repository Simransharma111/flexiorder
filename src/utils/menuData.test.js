import { describe, expect, it } from "vitest";
import { buildDishFormData, normalizeMenuResponse } from "./menuData";
import { resolveCategoryReference } from "./menuCategories";

describe("menu data", () => {
  it.each([
    [[{ _id: "dish-1", name: "Soup" }]],
    [{ dishes: [{ _id: "dish-1", name: "Soup" }] }],
    [{ menu: [{ _id: "dish-1", name: "Soup" }] }],
    [{ data: { dishes: [{ _id: "dish-1", name: "Soup" }] } }],
  ])("normalizes supported menu response envelopes", (payload) => {
    expect(normalizeMenuResponse(payload)).toEqual([
      expect.objectContaining({ _id: "dish-1", name: "Soup" }),
    ]);
  });

  it("rejects malformed menu responses instead of treating them as empty", () => {
    expect(normalizeMenuResponse({ message: "ok" })).toBeNull();
  });

  it("preserves a populated category id when serializing", () => {
    const category = resolveCategoryReference("House Specials", [{
      category: { _id: "category-1", name: "House Specials" },
    }]);
    const form = buildDishFormData({ name: "Platter", category, tags: [] });
    expect(form.get("category")).toBe("category-1");
    expect(form.get("categoryName")).toBe("House Specials");
  });

  it("does not send an empty category during a partial update", () => {
    const form = buildDishFormData({ isAvailable: false });
    expect(form.has("category")).toBe(false);
  });
});
