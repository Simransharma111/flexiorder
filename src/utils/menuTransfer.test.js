import { describe, expect, it } from "vitest";

import {
  buildMenuExport,
  MENU_TRANSFER_FORMAT,
  MENU_TRANSFER_MAX_BYTES,
  parseMenuImport,
  serializeMenuExport,
} from "./menuTransfer";

const dish = (overrides = {}) => ({
  _id: "dish-source",
  hotelId: "hotel-source",
  categoryId: { _id: "category-source", name: " Main Course " },
  name: " Paneer Butter Masala ",
  description: " Rich gravy ",
  image: "https://example.test/dish.jpg",
  price: 325,
  prepTime: 0,
  foodType: "veg",
  isAvailable: true,
  isRecommended: true,
  isBestseller: false,
  featured: false,
  todaySpecial: true,
  isPopular: false,
  isNewArrival: false,
  chefChoice: true,
  spiceLevel: "medium",
  tags: [" Dinner ", "dinner", "Popular"],
  gst: 5,
  displayOrder: 2,
  pendingSync: true,
  ...overrides,
});

describe("portable menu transfer", () => {
  it("exports only canonical persisted fields and preserves zero values", () => {
    const exported = buildMenuExport([dish()], "2026-08-13T00:00:00.000Z");
    expect(exported).toMatchObject({
      format: MENU_TRANSFER_FORMAT,
      version: 1,
      exportedAt: "2026-08-13T00:00:00.000Z",
      dishes: [{ category: "Main Course", name: "Paneer Butter Masala", prepTime: 0 }],
    });
    expect(exported.dishes[0].tags).toEqual(["Dinner", "Popular"]);
    expect(exported.dishes[0]).not.toHaveProperty("_id");
    expect(exported.dishes[0]).not.toHaveProperty("hotelId");
    expect(exported.dishes[0]).not.toHaveProperty("categoryId");
    expect(exported.dishes[0]).not.toHaveProperty("image");
    expect(exported.dishes[0]).not.toHaveProperty("pendingSync");
  });

  it("round trips canonical exports and accepts legacy arrays", () => {
    const exported = buildMenuExport([dish()]);
    expect(parseMenuImport(JSON.stringify(exported)).dishes).toEqual(exported.dishes);
    expect(parseMenuImport(JSON.stringify(exported.dishes)).dishes).toEqual(exported.dishes);
  });

  it("falls back to legacy category names when a populated category is incomplete", () => {
    const exported = buildMenuExport([
      dish({ category: { _id: "category-source" }, categoryName: "Desserts" }),
    ]);
    expect(exported.dishes[0].category).toBe("Desserts");
  });

  it("rejects malformed, unsupported, oversized and excessive input", () => {
    expect(() => parseMenuImport("not json")).toThrow(/not valid JSON/);
    expect(() => parseMenuImport(JSON.stringify({ version: 1, dishes: [dish()] }))).toThrow(
      /Unsupported menu format/
    );
    expect(() => parseMenuImport(JSON.stringify({
      format: MENU_TRANSFER_FORMAT,
      version: 2,
      dishes: [dish()],
    }))).toThrow(/Unsupported menu version/);
    expect(() => parseMenuImport("[]")).toThrow(/does not contain any dishes/);
    expect(() => parseMenuImport("[]", MENU_TRANSFER_MAX_BYTES + 1)).toThrow(/1 MB or smaller/);
    expect(() => parseMenuImport(Array.from({ length: 501 }, () => dish()))).toThrow(
      /more than 500 dishes/
    );
    expect(() => parseMenuImport({
      format: MENU_TRANSFER_FORMAT,
      version: 1,
      exportedAt: "not-a-date",
      dishes: [dish()],
    })).toThrow(/valid exportedAt timestamp/);
  });

  it("strictly rejects string numbers, string booleans and invalid enums", () => {
    expect(() => parseMenuImport([dish({ price: "325" })])).toThrow(/price must be/);
    expect(() => parseMenuImport([dish({ isAvailable: "true" })])).toThrow(/must be true or false/);
    expect(() => parseMenuImport([dish({ foodType: "egg" })])).toThrow(/food type/);
    expect(() => parseMenuImport([dish({ categoryId: undefined, category: "64b64b64b64b64b64b64b64b" })])).toThrow(
      /not a database ID/
    );
  });

  it("refuses to create an export that cannot fit through the import limit", () => {
    const largeDish = dish({ description: "x".repeat(4000) });
    expect(() => serializeMenuExport(Array.from({ length: 300 }, () => largeDish))).toThrow(
      /larger than 1 MB/
    );
  });
});
