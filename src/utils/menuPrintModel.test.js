import { describe, expect, it } from "vitest";
import { buildMenuPrintModel, defaultMenuPrintSelection } from "./menuPrintModel";

const dishes = [
  { _id: "starter", name: "Starter", category: "Starters", price: 120, isAvailable: true, displayOrder: 2 },
  { _id: "combo", name: "Thali", category: "Mains", price: 299, isAvailable: true, displayOrder: 1, comboConfig: { includedItems: ["Rice"], selectionGroups: [{ name: "Curry", minSelections: 1, maxSelections: 2, items: ["Dal", "Paneer"] }] } },
  { _id: "hidden", name: "Hidden", category: "Mains", price: 90, isAvailable: false },
  { _id: "unknown", name: "Market fish", category: "Mains", price: "", isAvailable: true },
];

describe("menu print model", () => {
  it("captures selected available dishes without changing the source menu", () => {
    const source = structuredClone(dishes);
    const model = buildMenuPrintModel({
      restaurant: { name: "Kitchen", menuMode: "simple" }, dishes, categories: [{ name: "Mains", displayOrder: 1 }, { name: "Starters", displayOrder: 2 }],
      selectedDishIds: new Set(["starter", "combo", "unknown"]),
    });
    expect(model.sections.map((section) => section.name)).toEqual(["Mains", "Starters"]);
    expect(model.sections.flatMap((section) => section.dishes).map((dish) => dish.name)).toEqual(["Thali", "Market fish", "Starter"]);
    expect(model.sections[0].dishes[0].combo).toMatchObject({ included: ["Rice"], choices: [{ instruction: "Choose 1–2" }] });
    expect(model.sections[0].dishes[1].priceLabel).toBe("Price on request");
    expect(model.settings.includePhotos).toBe(false);
    expect(dishes).toEqual(source);
  });

  it("flags malformed combo definitions and pending snapshots instead of inventing details", () => {
    const model = buildMenuPrintModel({ dishes: [{ _id: "bad", name: "Combo", price: 0, isAvailable: true, pendingSync: true, comboConfig: { selectionGroups: [{ name: "Pick", minSelections: 2, maxSelections: 1, items: ["A"] }] } }] });
    expect(model.sections[0].dishes[0].priceLabel).toBe("₹0.00");
    expect(model.warnings.join(" ")).toMatch(/Check combo choices.*pending menu change/);
    expect(model.sections[0].dishes[0].combo.choices[0].instruction).toMatch(/confirmation/);
  });

  it("defaults only available dish IDs and omits invalid QR links", () => {
    expect([...defaultMenuPrintSelection(dishes)]).toEqual(["starter", "combo", "unknown"]);
    const model = buildMenuPrintModel({ restaurant: { qrUrl: "hotel-1" }, dishes });
    expect(model.restaurant.qrUrl).toBe("");
    expect(model.warnings.join(" ")).toMatch(/QR link is invalid/);
    expect(buildMenuPrintModel({ restaurant: { qrUrl: "https://menu.example/qr/table-code" }, dishes }).restaurant.qrUrl)
      .toBe("https://menu.example/qr/table-code");
    expect(buildMenuPrintModel({ restaurant: { qrUrl: "https://menu.example/menu/hotel-1" }, dishes }).restaurant.qrUrl)
      .toBe("");
  });

  it("keeps paper sizes within their supported poster or booklet layouts", () => {
    expect(buildMenuPrintModel({ settings: { layout: "poster", format: "A5" } }).settings.format).toBe("A4");
    expect(buildMenuPrintModel({ settings: { layout: "booklet", format: "A3" } }).settings.format).toBe("A4");
    expect(buildMenuPrintModel({ settings: { layout: "booklet", format: "A5" } }).settings.format).toBe("A5");
  });

  it("uses the restaurant presentation preference only as the print default", () => {
    expect(buildMenuPrintModel({ restaurant: { menuMode: "visual" } }).settings.includePhotos).toBe(true);
    expect(buildMenuPrintModel({ restaurant: { menuMode: "simple" }, settings: { includePhotos: true } }).settings.includePhotos).toBe(true);
    expect(buildMenuPrintModel({ settings: { allowRemoteImages: false } }).settings.allowRemoteImages).toBe(false);
  });

  it("matches customer-menu discount pricing without turning missing prices into free dishes", () => {
    const model = buildMenuPrintModel({ dishes: [
      { _id: "discount", name: "Discounted", category: "Mains", price: 200, discountType: "percentage", discountValue: 10 },
      { _id: "missing", name: "Missing", category: "Mains", price: null },
    ] });
    expect(model.sections[0].dishes[0]).toMatchObject({
      basePrice: 200,
      price: 180,
      hasDiscount: true,
      priceLabel: "₹180.00 · was ₹200.00",
    });
    expect(model.sections[0].dishes[1].priceLabel).toBe("Price on request");
  });
});
