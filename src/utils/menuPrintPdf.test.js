import { afterEach, describe, expect, it, vi } from "vitest";
import { buildMenuPrintModel } from "./menuPrintModel";
import { createMenuPrintPdf, menuPrintFilename, paginateMenuPrintModel, measureMenuBranding } from "./menuPrintPdf";

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


describe("measured PDF row pagination", () => {
  afterEach(() => vi.unstubAllGlobals());
  const mockCanvas = () => {
    const ctx = { font: "27px system-ui", measureText(text) {
      const size = Number(this.font.match(/([\d.]+)px/)[1]);
      return { width: Array.from(text).length * size * .56 };
    } };
    vi.stubGlobal("document", { createElement: () => ({ getContext: () => ctx }) });
  };
  it("keeps ordinary dishes together when the next page has room", () => {
    mockCanvas();
    const model = buildMenuPrintModel({ settings: { layout: "booklet", format: "A5" }, dishes: Array.from({ length: 12 }, (_, i) => ({
      _id: String(i), name: `Dish ${i}`, category: "Mains", price: 10,
      description: "A carefully prepared dish with fresh ingredients and a seasonal accompaniment.",
    })) });
    const entries = paginateMenuPrintModel(model).flat().filter((entry) => entry.dish);
    expect(entries).toHaveLength(12);
    expect(entries.every((entry) => !entry.continuation)).toBe(true);
  });
  it("loads the banner when restaurant logo is disabled, without dish photos", async () => {
    mockCanvas();
    const requested = [];
    vi.stubGlobal("Image", class {
      set src(value) { requested.push(value); queueMicrotask(() => this.onload?.()); }
    });
    const controller = new AbortController();
    const model = buildMenuPrintModel({ restaurant: { banner: "banner.png", logo: "restaurant-logo.png" },
      settings: { includeLogo: false, includePhotos: false, includeCover: true },
      dishes: [{ _id: "one", name: "One", price: 1, image: "dish.png" }] });
    await expect(createMenuPrintPdf(model, { signal: controller.signal, onProgress: ({ completed, total }) => {
      if (completed === total) controller.abort();
    } })).rejects.toMatchObject({ name: "AbortError" });
    expect(requested).toContain("banner.png");
    expect(requested).not.toContain("restaurant-logo.png");
    expect(requested).not.toContain("dish.png");
  });
  it.each([["poster", "A3", 1485, 2100], ["poster", "A4", 1050, 1485], ["booklet", "A4", 1050, 1485], ["booklet", "A5", 740, 1050]])(
    "keeps all long name, price and combo text inside %s %s pages", (layout, format, width, height) => {
      mockCanvas();
      const name = "Long multilingual विशेष dish ".repeat(100).trim();
      const description = "Description preserved across pages ".repeat(160).trim();
      const note = "Print note complete ".repeat(100).trim();
      const model = buildMenuPrintModel({ settings: { layout, format, textSize: "large", notes: note }, dishes: [{
        _id: "long", name, description, price: 9999999999999, category: "Mains", image: "missing.png",
        comboConfig: { includedItems: ["Included ".repeat(300)], selectionGroups: [{ name: "Choose", minSelections: 1, maxSelections: 1, items: ["Option ".repeat(300)] }] },
      }] });
      const pages = paginateMenuPrintModel(model, { width, height }, new Map());
      expect(pages.length).toBeGreaterThan(2);
      const entries = pages.flat().filter((entry) => entry.dish);
      for (const entry of entries) {
        expect(entry.y).toBeGreaterThan(0);
        expect(entry.y + entry.height).toBeLessThanOrEqual(height - 112);
        expect(entry.geometry.imageWidth).toBe(0);
      }
      const leftText = entries.flatMap((entry) => entry.geometry.bands.map((band) => band.left?.text || "")).join(" ");
      expect(leftText.replace(/\s+/g, " ")).toContain(name);
      expect(leftText.replace(/\s+/g, " ")).toContain(description);
      expect(leftText.replace(/\s+/g, " ")).toContain(note);
      const price = entries.flatMap((entry) => entry.geometry.bands.map((band) => band.right?.text || "")).join("");
      expect(price).toBe(model.sections[0].dishes[0].priceLabel);
    }
  );
});


describe("branding bounds", () => {
  const ctx = { font: "27px system-ui", measureText(text) {
    return { width: Array.from(text).length * Number(this.font.match(/([\d.]+)px/)[1]) * .56 };
  } };
  afterEach(() => vi.unstubAllGlobals());
  it("separates an A5 title, menu label and contact block and preserves overflow", () => {
    vi.stubGlobal("document", { createElement: () => ({ getContext: () => ctx }) });
    const model = buildMenuPrintModel({ restaurant: { name: "The Wonderful Indian Restaurant", address: "A very long address ".repeat(20), phone: "1234567890", email: "hello@example.test", website: "example.test" }, settings: { layout: "booklet", format: "A5", textSize: "large" }, dishes: [{ _id: "one", name: "Dish", price: 1 }] });
    for (const mode of ["hero", "compact", "cover"]) {
      const b = measureMenuBranding(ctx, model, {width:740,height:1050}, new Map(), mode);
      expect(b.title.y + b.title.lines.length * b.title.line).toBeLessThan(b.menu.y);
      expect(b.menu.y + 30).toBeLessThan(b.metadata.y);
    }
    const details = paginateMenuPrintModel(model).flat().filter(e => e.dish?.id === "__restaurant-details__");
    expect(details.flatMap(e => e.geometry.bands.map(b => b.left?.text || "")).join(" ")).toContain("hello@example.test");
  });
  it("rejects unsupported tiny metrics instead of entering a pagination loop", () => {
    const model = buildMenuPrintModel({ dishes: [{_id:"one", name:"Dish",price:1}] });
    expect(() => paginateMenuPrintModel(model, {width:300,height:300})).toThrow("Page is too small");
  });
});
