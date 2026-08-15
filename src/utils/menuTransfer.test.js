import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../api/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

import api from "../api/axios";
import {
  buildMenuExport,
  importMenuViaSingleDishEndpoints,
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

const CAT_STARTERS = "68f0a1b2c3d4e5f60718293a";
const CAT_MAIN = "68f0a1b2c3d4e5f60718293b";

const portablePayload = (dishes) =>
  parseMenuImport({
    format: MENU_TRANSFER_FORMAT,
    version: 1,
    exportedAt: "2026-08-13T00:00:00.000Z",
    dishes,
  });

const formDataValue = (formData, key) => formData.get(key);

const dishPostResponses = () =>
  api.post.mockResolvedValue({ data: { dish: { _id: "created-dish" } } });

describe("importMenuViaSingleDishEndpoints", () => {
  beforeEach(() => {
    api.get.mockReset();
    api.post.mockReset();
    api.put.mockReset();
  });

  it("creates missing categories before dishes, skips existing duplicates, and reports bulk-shaped counts", async () => {
    api.get.mockResolvedValue({ data: [] });
    api.post.mockImplementation((url, bodyOrForm) => {
      if (url === "/menu/category") {
        return Promise.resolve({
          data: {
            _id: bodyOrForm.name === "Starters" ? CAT_STARTERS : CAT_MAIN,
            name: bodyOrForm.name,
            subCategories: bodyOrForm.subCategories,
            isActive: true,
          },
        });
      }
      return Promise.resolve({ data: { dish: { _id: "created-dish" } } });
    });

    const payload = portablePayload([
      dish({ _id: undefined, category: "Starters", subCategory: "Vegetarian", name: "Paneer Tikka", image: undefined }),
      dish({ _id: undefined, category: "Main Course", subCategory: "Curries", name: "Dal Tadka", image: undefined }),
      dish({ _id: undefined, category: "Main Course", subCategory: "Curries", name: "Dal Tadka", image: undefined }),
    ]);

    const progress = [];
    const result = await importMenuViaSingleDishEndpoints(payload, {
      hotelId: "hotel-1",
      existingDishes: [],
      onProgress: (done, total) => progress.push([done, total]),
    });

    // first duplicate-free create succeeds; within-file repeat is skipped
    expect(result).toEqual({ success: true, imported: 2, skipped: 1, errors: 0, total: 3 });

    const categoryPosts = api.post.mock.calls.filter(([url]) => url === "/menu/category");
    expect(categoryPosts).toHaveLength(2);
    expect(categoryPosts[0][1]).toEqual({ name: "Starters", subCategories: ["Vegetarian"] });

    const dishPosts = api.post.mock.calls.filter(([url]) => url === "/menu/dish");
    expect(dishPosts).toHaveLength(2);
    const firstForm = dishPosts[0][1];
    expect(formDataValue(firstForm, "categoryId")).toBe(CAT_STARTERS);
    expect(formDataValue(firstForm, "categoryName")).toBe("Starters");
    expect(formDataValue(firstForm, "name")).toBe("Paneer Tikka");
    expect(progress).toEqual([[0, 3], [1, 3], [2, 3], [3, 3]]);
  });

  it("skips dishes already on the menu without creating them", async () => {
    api.get.mockResolvedValue({
      data: [{
        _id: CAT_STARTERS,
        name: "Starters",
        subCategories: ["Vegetarian"],
        isActive: true,
      }],
    });
    dishPostResponses();

    const payload = portablePayload([
      dish({ _id: undefined, category: "Starters", subCategory: "Vegetarian", name: "Paneer Tikka", image: undefined }),
    ]);
    const result = await importMenuViaSingleDishEndpoints(payload, {
      hotelId: "hotel-1",
      existingDishes: [
        { name: "paneer tikka", categoryId: { _id: CAT_STARTERS, name: "Starters" } },
      ],
    });

    expect(result).toEqual({ success: true, imported: 0, skipped: 1, errors: 0, total: 1 });
    expect(api.post).not.toHaveBeenCalledWith("/menu/category", expect.anything());
    expect(api.post.mock.calls.filter(([url]) => url === "/menu/dish")).toHaveLength(0);
    expect(api.put).not.toHaveBeenCalled();
  });

  it("merges file-only subcategories into an existing category", async () => {
    api.get.mockResolvedValue({
      data: [{
        _id: CAT_STARTERS,
        name: "Starters",
        subCategories: ["Fried", "vegetarian"],
        isActive: true,
      }],
    });
    api.put.mockResolvedValue({
      data: {
        _id: CAT_STARTERS,
        name: "Starters",
        subCategories: ["Fried", "vegetarian", "Baked"],
        isActive: true,
      },
    });
    dishPostResponses();

    const payload = portablePayload([
      dish({ _id: undefined, category: "Starters", subCategory: "Baked", name: "Baked Samosa", image: undefined }),
    ]);
    const result = await importMenuViaSingleDishEndpoints(payload, { hotelId: "hotel-1" });

    expect(api.put).toHaveBeenCalledWith(`/menu/category/${CAT_STARTERS}`, {
      name: "Starters",
      subCategories: ["Fried", "vegetarian", "Baked"],
    });
    expect(result.imported).toBe(1);
  });

  it("counts server-side duplicate rejections as skipped", async () => {
    api.get.mockResolvedValue({ data: [{ _id: CAT_MAIN, name: "Main Course", subCategories: [], isActive: true }] });
    api.post.mockRejectedValue({ response: { status: 400, data: { message: "Dish already exists" } } });

    const payload = portablePayload([
      dish({ _id: undefined, category: "Main Course", name: "Dal Tadka", image: undefined }),
    ]);
    const result = await importMenuViaSingleDishEndpoints(payload, { hotelId: "hotel-1" });

    expect(result).toEqual({ success: true, imported: 0, skipped: 1, errors: 0, total: 1 });
  });

  it("stops on an unexpected dish failure with honest partial counts", async () => {
    api.get.mockResolvedValue({ data: [{ _id: CAT_MAIN, name: "Main Course", subCategories: [], isActive: true }] });
    api.post
      .mockResolvedValueOnce({ data: { dish: { _id: "ok-dish" } } })
      .mockRejectedValueOnce({ response: { status: 500, data: { message: "boom" } } });

    const payload = portablePayload([
      dish({ _id: undefined, category: "Main Course", name: "One", image: undefined }),
      dish({ _id: undefined, category: "Main Course", name: "Two", image: undefined }),
      dish({ _id: undefined, category: "Main Course", name: "Three", image: undefined }),
    ]);

    await expect(
      importMenuViaSingleDishEndpoints(payload, { hotelId: "hotel-1" })
    ).rejects.toThrow(/1 dishes imported and 0 skipped before the import stopped: boom/);
    expect(api.post.mock.calls.filter(([url]) => url === "/menu/dish")).toHaveLength(2);
  });

  it("fails honestly when a new category cannot be confirmed", async () => {
    api.get.mockResolvedValue({ data: [] });
    api.post.mockRejectedValue({ response: { status: 403, data: { message: "Not allowed" } } });

    const payload = portablePayload([
      dish({ _id: undefined, category: "Starters", name: "Paneer Tikka", image: undefined }),
    ]);

    await expect(
      importMenuViaSingleDishEndpoints(payload, { hotelId: "hotel-1" })
    ).rejects.toThrow(/Not allowed/);
    expect(api.post.mock.calls.filter(([url]) => url === "/menu/dish")).toHaveLength(0);
  });
});
