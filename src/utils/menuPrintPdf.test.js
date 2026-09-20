import { describe, expect, it } from "vitest";
import { buildMenuPrintModel } from "./menuPrintModel";
import { createMenuPrintPdf, menuPrintFilename, paginateMenuPrintModel } from "./menuPrintPdf";

describe("menu print pagination", () => {
  it("splits long content into sequential bounded pages and creates a safe filename", () => {
    const model = buildMenuPrintModel({ restaurant: { name: "A / B Kitchen" }, settings: { layout: "booklet", format: "A5" }, dishes: Array.from({ length: 18 }, (_, index) => ({ _id: String(index), name: `Dish ${index} with a deliberately long printable name`, description: "A long description that needs measured space in a printed layout.", price: index + 10, isAvailable: true, category: "Mains" })) });
    const pages = paginateMenuPrintModel(model);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.flat().map((entry) => entry.dish.id)).toEqual(Array.from({ length: 18 }, (_, index) => String(index)));
    expect(menuPrintFilename(model)).toBe("a-b-kitchen-menu.pdf");
  });

  it("never creates a page for an empty selection", () => {
    const model = buildMenuPrintModel({ dishes: [] });
    expect(paginateMenuPrintModel(model)).toEqual([]);
  });

  it("keeps the complete print-only note as printable content", () => {
    const notes = "A long owner note ".repeat(80).trim();
    const model = buildMenuPrintModel({ settings: { notes }, dishes: [{ _id: "one", name: "One", price: 1 }] });
    const noteEntries = paginateMenuPrintModel(model).flat().filter((entry) => entry.section.key === "__print-note__");
    expect(noteEntries.map((entry) => entry.dish.name).join(" ")).toContain("A long owner note");
  });

  it("cancels before any page artwork or file is created", async () => {
    const controller = new AbortController();
    controller.abort();
    const model = buildMenuPrintModel({ dishes: [{ _id: "one", name: "One", price: 1, isAvailable: true }] });
    await expect(createMenuPrintPdf(model, { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
  });

  it("splits an oversized combo across continuation entries instead of clipping it", () => {
    const model = buildMenuPrintModel({ settings: { layout: "booklet", format: "A5" }, dishes: [{
      _id: "huge", name: "Celebration combo", category: "Combos", price: 999,
      comboConfig: { includedItems: [], selectionGroups: Array.from({ length: 80 }, (_, index) => ({
        name: `Choice ${index + 1}`, minSelections: 1, maxSelections: 1, items: [`Option ${index + 1}`],
      })) },
    }] });
    const pages = paginateMenuPrintModel(model);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.flat().some((entry) => /continued/i.test(entry.dish.name))).toBe(true);
    expect(pages.flat().reduce((count, entry) => count + (entry.dish.combo?.choices.length || 0), 0)).toBe(80);
  });
});
