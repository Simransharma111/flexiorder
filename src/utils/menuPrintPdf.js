import { jsPDF } from "jspdf";

const MM_TO_PX = 5; // 127 dpi keeps A3 previews useful without huge memory pressure.
const FORMAT_MM = { A3: [297, 420], A4: [210, 297], A5: [148, 210] };
const MARGIN = 62;
const HEADER_BOTTOM = 160;
const HERO_BOTTOM = 370;
const FOOTER_HEIGHT = 98;
const aborted = () => new DOMException("PDF creation cancelled", "AbortError");
const checkpoint = (signal) => { if (signal?.aborted) throw aborted(); };
const yieldWork = () => new Promise((resolve) => setTimeout(resolve, 0));

const pageMetrics = (settings) => {
  const size = FORMAT_MM[settings.format] || FORMAT_MM.A4;
  return { width: Math.round(size[0] * MM_TO_PX), height: Math.round(size[1] * MM_TO_PX), mm: size };
};

const wrap = (context, text, maxWidth) => {
  const words = String(text || "").split(/\s+/).filter(Boolean).flatMap((word) => {
    if (context.measureText(word).width <= maxWidth) return [word];
    const parts = [];
    let part = "";
    for (const character of Array.from(word)) {
      if (part && context.measureText(`${part}${character}`).width > maxWidth) {
        parts.push(part);
        part = character;
      } else part += character;
    }
    if (part) parts.push(part);
    return parts;
  });
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (line && context.measureText(next).width > maxWidth) { lines.push(line); line = word; }
    else line = next;
  });
  if (line) lines.push(line);
  return lines;
};

const drawLines = (ctx, text, x, y, width, lineHeight, maxLines = Infinity) => {
  const lines = wrap(ctx, text, width).slice(0, maxLines);
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  return lines.length * lineHeight;
};

const makeCanvas = ({ width, height }) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const drawImageCover = (ctx, image, x, y, width, height, radius = 0) => {
  const sourceWidth = image.naturalWidth || image.width || width;
  const sourceHeight = image.naturalHeight || image.height || height;
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = width / height;
  let sx = 0;
  let sy = 0;
  let sw = sourceWidth;
  let sh = sourceHeight;
  if (sourceRatio > targetRatio) {
    sw = sourceHeight * targetRatio;
    sx = (sourceWidth - sw) / 2;
  } else {
    sh = sourceWidth / targetRatio;
    sy = (sourceHeight - sh) / 2;
  }
  ctx.save();
  if (radius > 0) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.clip();
  }
  ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
  ctx.restore();
};

const pageBase = (metrics) => {
  const canvas = makeCanvas(metrics);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fffdf8";
  ctx.fillRect(0, 0, metrics.width, metrics.height);
  ctx.fillStyle = "#e36a2e";
  ctx.fillRect(0, 0, metrics.width, 18);
  return { canvas, ctx };
};

const loadImage = (url, signal) => new Promise((resolve) => {
  if (!url || signal?.aborted) { resolve(null); return; }
  const image = new Image();
  let settled = false;
  let timer;
  const finish = (result) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
    image.onload = null;
    image.onerror = null;
    resolve(result);
  };
  const onAbort = () => { image.src = ""; finish(null); };
  timer = setTimeout(onAbort, 7000);
  signal?.addEventListener("abort", onAbort, { once: true });
  image.crossOrigin = "anonymous";
  image.onload = () => finish(image);
  image.onerror = () => finish(null);
  image.src = url;
});

const preloadImages = async (model, signal, onProgress) => {
  const requestedUrls = [...new Set([
    ...(model.settings.includeLogo ? [model.restaurant.banner] : []),
    ...(model.settings.includeLogo ? [model.restaurant.logo] : []),
    ...(model.settings.includePhotos
      ? model.sections.flatMap((section) => section.dishes.map((dish) => dish.image))
      : []),
  ].filter(Boolean))];
  const canAttempt = (url) => {
    if (model.settings.allowRemoteImages !== false || !/^https?:\/\//i.test(url)) return true;
    try {
      return typeof window !== "undefined" && new URL(url, window.location.href).origin === window.location.origin;
    } catch {
      return false;
    }
  };
  const urls = requestedUrls.filter(canAttempt);
  const skipped = requestedUrls.filter((url) => !canAttempt(url));
  const images = new Map();
  let cursor = 0;
  let completed = 0;
  const worker = async () => {
    while (cursor < urls.length) {
      checkpoint(signal);
      const url = urls[cursor++];
      const image = await loadImage(url, signal);
      if (image) images.set(url, image);
      completed += 1;
      onProgress?.({ stage: "images", completed, total: urls.length, failed: image ? [] : [url] });
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, urls.length) }, worker));
  return { images, failed: [...skipped, ...urls.filter((url) => !images.has(url))] };
};

const fallbackPaginate = (model) => {
  const baseCapacity = model.settings.layout === "booklet" ? 7 : 12;
  const pages = [];
  let page = [];
  let used = 0;
  model.sections.forEach((section) => {
    section.dishes.forEach((dish, dishIndex) => {
      const unitsFor = (candidate) => 1 + Math.ceil((candidate.name.length + candidate.description.length) / 105)
        + (candidate.combo ? candidate.combo.included.length + candidate.combo.choices.length * 2 : 0)
        + (model.settings.includePhotos && candidate.image ? 2 : 0);
      let printableDishes = [dish];
      if (unitsFor(dish) > baseCapacity && dish.combo?.choices.length > 1) {
        const choiceChunkSize = Math.max(1, Math.floor((baseCapacity - 3) / 2));
        printableDishes = [];
        for (let index = 0; index < dish.combo.choices.length; index += choiceChunkSize) {
          const first = index === 0;
          printableDishes.push(first ? {
            ...dish,
            combo: { included: dish.combo.included, choices: dish.combo.choices.slice(index, index + choiceChunkSize) },
          } : continuedDish(dish, {
            description: "",
            combo: { included: [], choices: dish.combo.choices.slice(index, index + choiceChunkSize) },
          }));
        }
      }
      printableDishes.forEach((printableDish, printableIndex) => {
        const units = unitsFor(printableDish);
        if (page.length && used + units > baseCapacity) { pages.push(page); page = []; used = 0; }
        page.push({ section, dish: printableDish, showHeading: (dishIndex === 0 && printableIndex === 0) || !page.some((entry) => entry.section.key === section.key) });
        used += units;
      });
    });
  });
  if (page.length) pages.push(page);
  return pages.length ? pages : [];
};

const measureEntry = (ctx, entry, model, priorSection, priorSubcategory, width) => {
  const { section, dish } = entry;
  const scale = model.settings.layout === "poster" ? 1.22 : 1;
  let height = 0;
  if (priorSection !== section.key) height += 58 * scale;
  if (dish.subcategory && priorSubcategory !== dish.subcategory) height += 23 * scale;
  const hasImage = model.settings.includePhotos && dish.image;
  const imageWidth = hasImage ? 125 * scale : 0;
  const priceWidth = dish.isPrintNote ? 0 : (dish.hasDiscount ? 220 : 125) * scale;
  ctx.font = `700 ${18 * scale}px system-ui, sans-serif`;
  let contentHeight = wrap(ctx, dish.name, width - imageWidth - priceWidth).length * 23 * scale + 1;
  if (model.settings.includeDietary && dish.dietary) contentHeight += 19 * scale;
  if (model.settings.includeDescriptions && dish.description) {
    ctx.font = `${14 * scale}px system-ui, sans-serif`;
    contentHeight += wrap(ctx, dish.description, width - imageWidth).length * 18 * scale;
  }
  if (dish.combo) {
    ctx.font = `600 ${13 * scale}px system-ui, sans-serif`;
    if (dish.combo.included.length) contentHeight += wrap(ctx, `Included: ${dish.combo.included.join(", ")}`, width - imageWidth).length * 17 * scale;
    dish.combo.choices.forEach((choice) => {
      contentHeight += wrap(ctx, `${choice.name} — ${choice.instruction}: ${choice.items.join(", ") || "not set"}`, width - imageWidth).length * 17 * scale;
    });
  }
  return height + Math.max(contentHeight + 24 * scale, hasImage ? 96 * scale : 45 * scale);
};

const continuedDish = (dish, changes) => ({
  ...dish,
  ...changes,
  name: `${dish.name.replace(/ \(continued\)$/i, "")} (continued)`,
  image: "",
});

const printableSections = (model) => model.settings.notes ? [
  ...model.sections,
  {
    key: "__print-note__",
    name: "Please note",
    dishes: [{
      id: "__print-note__",
      name: model.settings.notes,
      description: "",
      image: "",
      dietary: "",
      priceLabel: "",
      combo: null,
      subcategory: "",
      isPrintNote: true,
    }],
  },
] : model.sections;

const splitOversizedDish = (ctx, section, dish, model, width, maximumHeight, depth = 0) => {
  const entry = { section, dish };
  if (depth >= 12 || measureEntry(ctx, entry, model, null, null, width) <= maximumHeight) return [dish];
  if (dish.isPrintNote && dish.name.length > 1) {
    const midpoint = Math.floor(dish.name.length / 2);
    const boundary = dish.name.lastIndexOf(" ", midpoint);
    const splitAt = boundary > 0 ? boundary : midpoint;
    return [
      ...splitOversizedDish(ctx, section, { ...dish, name: dish.name.slice(0, splitAt).trim() }, model, width, maximumHeight, depth + 1),
      ...splitOversizedDish(ctx, section, { ...dish, name: dish.name.slice(splitAt).trim() }, model, width, maximumHeight, depth + 1),
    ];
  }
  if (dish.description?.length > 1) {
    const midpoint = Math.floor(dish.description.length / 2);
    const boundary = dish.description.lastIndexOf(" ", midpoint);
    const splitAt = boundary > 0 ? boundary : midpoint;
    const first = { ...dish, description: dish.description.slice(0, splitAt).trim(), combo: null };
    const second = continuedDish(dish, { description: dish.description.slice(splitAt).trim() });
    return [
      ...splitOversizedDish(ctx, section, first, model, width, maximumHeight, depth + 1),
      ...splitOversizedDish(ctx, section, second, model, width, maximumHeight, depth + 1),
    ];
  }
  const included = dish.combo?.included || [];
  const choices = dish.combo?.choices || [];
  if (choices.length > 1) {
    const midpoint = Math.ceil(choices.length / 2);
    const first = { ...dish, combo: { included, choices: choices.slice(0, midpoint) } };
    const second = continuedDish(dish, { combo: { included: [], choices: choices.slice(midpoint) } });
    return [
      ...splitOversizedDish(ctx, section, first, model, width, maximumHeight, depth + 1),
      ...splitOversizedDish(ctx, section, second, model, width, maximumHeight, depth + 1),
    ];
  }
  if (included.length > 1) {
    const midpoint = Math.ceil(included.length / 2);
    const first = { ...dish, combo: { included: included.slice(0, midpoint), choices: [] } };
    const second = continuedDish(dish, { combo: { included: included.slice(midpoint), choices } });
    return [
      ...splitOversizedDish(ctx, section, first, model, width, maximumHeight, depth + 1),
      ...splitOversizedDish(ctx, section, second, model, width, maximumHeight, depth + 1),
    ];
  }
  const optionItems = choices[0]?.items || [];
  if (optionItems.length > 1) {
    const midpoint = Math.ceil(optionItems.length / 2);
    const firstChoice = { ...choices[0], items: optionItems.slice(0, midpoint) };
    const secondChoice = { ...choices[0], items: optionItems.slice(midpoint) };
    return [
      ...splitOversizedDish(ctx, section, { ...dish, combo: { included, choices: [firstChoice] } }, model, width, maximumHeight, depth + 1),
      ...splitOversizedDish(ctx, section, continuedDish(dish, { combo: { included: [], choices: [secondChoice] } }), model, width, maximumHeight, depth + 1),
    ];
  }
  return [dish];
};

/** Packs the actual printable text heights, rather than an item-count guess. */
export const paginateMenuPrintModel = (model, metrics = pageMetrics(model.settings)) => {
  const printableModel = { ...model, sections: printableSections(model) };
  if (typeof document === "undefined") return fallbackPaginate(printableModel);
  const canvas = makeCanvas({ width: 1, height: 1 });
  const ctx = canvas.getContext("2d");
  if (!ctx) return fallbackPaginate(model);
  const width = metrics.width - MARGIN * 2;
  const bodyEnd = metrics.height - FOOTER_HEIGHT;
  const pages = [];
  let page = [];
  let y = HERO_BOTTOM;
  let priorSection = null;
  let priorSubcategory = null;

  const maximumEntryHeight = bodyEnd - HEADER_BOTTOM - 60;
  printableModel.sections.forEach((section) => {
    const printableDishes = section.dishes.flatMap((dish) =>
      splitOversizedDish(ctx, section, dish, printableModel, width, maximumEntryHeight));
    printableDishes.forEach((dish, dishIndex) => {
      const entry = { section, dish, showHeading: dishIndex === 0 || !page.some((item) => item.section.key === section.key) };
      let height = measureEntry(ctx, entry, printableModel, priorSection, priorSubcategory, width);
      if (page.length && y + height > bodyEnd) {
        pages.push(page);
        page = [];
        y = HEADER_BOTTOM;
        priorSection = null;
        priorSubcategory = null;
        height = measureEntry(ctx, entry, printableModel, priorSection, priorSubcategory, width);
      }
      page.push(entry);
      y += height;
      priorSection = section.key;
      priorSubcategory = dish.subcategory || null;
    });
  });
  if (page.length) pages.push(page);
  return pages;
};

const initials = (name) => String(name || "Menu").split(/\s+/).filter(Boolean).slice(0, 2)
  .map((part) => part[0]).join("").toUpperCase();

const drawHeader = ({ ctx, model, metrics, pageNumber, images, hero }) => {
  const headerHeight = hero ? HERO_BOTTOM - 34 : 112;
  ctx.fillStyle = "#342923";
  ctx.fillRect(0, 18, metrics.width, headerHeight);
  const banner = images.get(model.restaurant.banner);
  if (banner) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    drawImageCover(ctx, banner, 0, 18, metrics.width, headerHeight);
    ctx.restore();
    const overlay = ctx.createLinearGradient(0, 0, metrics.width, 0);
    overlay.addColorStop(0, "rgba(30, 20, 17, .88)");
    overlay.addColorStop(0.62, "rgba(30, 20, 17, .48)");
    overlay.addColorStop(1, "rgba(30, 20, 17, .76)");
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 18, metrics.width, headerHeight);
  }
  ctx.fillStyle = "#e36a2e";
  ctx.fillRect(0, 18 + headerHeight - 12, metrics.width, 12);
  const logo = model.settings.includeLogo ? images.get(model.restaurant.logo) : null;
  const logoSize = hero ? 122 : 88;
  const logoY = hero ? 92 : 39;
  if (logo) {
    drawImageCover(ctx, logo, MARGIN, logoY, logoSize, hero ? 98 : 70, 12);
  } else {
    const radius = hero ? 49 : 35;
    ctx.fillStyle = "#f6d4bd"; ctx.beginPath(); ctx.arc(MARGIN + radius, logoY + radius, radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#342923"; ctx.font = `700 ${hero ? 32 : 24}px system-ui, sans-serif`; ctx.textAlign = "center";
    ctx.fillText(initials(model.restaurant.name), MARGIN + radius, logoY + radius + 8); ctx.textAlign = "left";
  }
  ctx.fillStyle = "#fffaf4";
  ctx.font = `700 ${hero ? 48 : 31}px system-ui, sans-serif`;
  const titleX = MARGIN + (hero ? 148 : 108);
  const titleY = hero ? 147 : 68;
  drawLines(ctx, model.restaurant.name, titleX, titleY, metrics.width - MARGIN - titleX, hero ? 53 : 35, 2);
  ctx.font = `600 ${hero ? 18 : 14}px system-ui, sans-serif`;
  ctx.fillStyle = "#f6d4bd";
  ctx.fillText("MENU", titleX, hero ? 232 : 112);
  if (hero && model.settings.includeContact) {
    const contact = [model.restaurant.address, model.restaurant.phone, model.restaurant.email, model.restaurant.website]
      .filter(Boolean).join("  ·  ");
    if (contact) {
      ctx.font = "15px system-ui, sans-serif";
      ctx.fillStyle = "#fffaf4";
      drawLines(ctx, contact, MARGIN, HERO_BOTTOM - 48, metrics.width - MARGIN * 2, 19, 2);
    }
  }
  ctx.fillStyle = "#6b625c";
  ctx.font = "18px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`Page ${pageNumber}`, metrics.width - MARGIN, metrics.height - 38);
  ctx.textAlign = "left";
};

const drawDocumentPage = ({ entries, model, metrics, pageNumber, images, isFirstContentPage }) => {
  const { canvas, ctx } = pageBase(metrics);
  const margin = MARGIN;
  const width = metrics.width - margin * 2;
  const scale = model.settings.layout === "poster" ? 1.22 : 1;
  let y = isFirstContentPage ? HERO_BOTTOM : HEADER_BOTTOM;
  drawHeader({ ctx, model, metrics, pageNumber, images, hero: isFirstContentPage });
  let priorSection = null;
  let priorSubcategory = null;
  entries.forEach(({ section, dish }) => {
    if (priorSection !== section.key) {
      ctx.fillStyle = "#f6d4bd";
      ctx.beginPath(); ctx.roundRect(margin, y + 2, width, 34 * scale, 8); ctx.fill();
      ctx.fillStyle = "#7c3219";
      ctx.font = `700 ${22 * scale}px system-ui, sans-serif`;
      y += 27 * scale;
      ctx.fillText(section.name, margin + 14, y);
      y += 31 * scale;
      priorSection = section.key;
      priorSubcategory = null;
    }
    if (dish.subcategory && priorSubcategory !== dish.subcategory) {
      ctx.fillStyle = "#625a55";
      ctx.font = `600 ${15 * scale}px system-ui, sans-serif`;
      ctx.fillText(dish.subcategory, margin, y);
      y += 23 * scale;
      priorSubcategory = dish.subcategory;
    }
    const image = model.settings.includePhotos ? images.get(dish.image) : null;
    const imageWidth = image ? 125 * scale : 0;
  const priceWidth = dish.isPrintNote ? 0 : (dish.hasDiscount ? 220 : 125) * scale;
    if (image) {
      drawImageCover(ctx, image, margin, y - 20 * scale, 105 * scale, 85 * scale, 8);
    }
    const x = margin + imageWidth;
    ctx.fillStyle = "#211c19";
    ctx.font = `700 ${18 * scale}px system-ui, sans-serif`;
    const nameHeight = drawLines(ctx, dish.name, x, y, width - imageWidth - priceWidth, 23 * scale);
    if (!dish.isPrintNote) {
      ctx.font = `700 ${17 * scale}px system-ui, sans-serif`;
      ctx.textAlign = "right"; ctx.fillText(dish.priceLabel, margin + width, y); ctx.textAlign = "left";
    }
    let dishY = y + nameHeight + 1;
    if (model.settings.includeDietary && dish.dietary) {
      ctx.fillStyle = dish.dietary === "Veg" ? "#237b45" : "#a33b2d";
      ctx.font = `600 ${13 * scale}px system-ui, sans-serif`;
      ctx.fillText(dish.dietary, x, dishY); dishY += 19 * scale;
    }
    if (model.settings.includeDescriptions && dish.description) {
      ctx.fillStyle = "#625a55"; ctx.font = `${14 * scale}px system-ui, sans-serif`;
      dishY += drawLines(ctx, dish.description, x, dishY, width - imageWidth, 18 * scale);
    }
    if (dish.combo) {
      ctx.fillStyle = "#4e4038"; ctx.font = `600 ${13 * scale}px system-ui, sans-serif`;
      if (dish.combo.included.length) {
        dishY += drawLines(ctx, `Included: ${dish.combo.included.join(", ")}`, x, dishY, width - imageWidth, 17 * scale);
      }
      dish.combo.choices.forEach((choice) => {
        dishY += drawLines(ctx, `${choice.name} — ${choice.instruction}: ${choice.items.join(", ") || "not set"}`, x, dishY, width - imageWidth, 17 * scale);
      });
    }
    y = Math.max(dishY + 24 * scale, y + (image ? 96 * scale : 45 * scale));
  });
  const footer = [
    `Snapshot: ${new Date(model.capturedAt).toLocaleString()}`,
    model.settings.includeContact && [model.restaurant.address, model.restaurant.phone, model.restaurant.email, model.restaurant.website]
      .filter(Boolean).join(" · "),
    model.restaurant.qrUrl,
  ].filter(Boolean).join("   |   ");
  if (footer) {
    ctx.fillStyle = "#625a55"; ctx.font = "12px system-ui, sans-serif";
    drawLines(ctx, footer, margin, metrics.height - 63, width - 85, 15, 2);
  }
  return canvas.toDataURL("image/png");
};

const drawCover = (model, metrics, images) => {
  const { canvas, ctx } = pageBase(metrics);
  ctx.fillStyle = "#e36a2e"; ctx.fillRect(0, 18, metrics.width, metrics.height - 18);
  const logo = model.settings.includeLogo ? images.get(model.restaurant.logo) : null;
  if (logo) drawImageCover(ctx, logo, metrics.width / 2 - 80, metrics.height / 2 - 260, 160, 128, 18);
  ctx.fillStyle = "#fffaf4"; ctx.textAlign = "center";
  ctx.font = "700 46px system-ui, sans-serif";
  drawLines(ctx, model.restaurant.name, metrics.width / 2, metrics.height / 2 - 30, 840, 58, 3);
  ctx.font = "24px system-ui, sans-serif"; ctx.fillText("Menu", metrics.width / 2, metrics.height / 2 + 150);
  if (model.restaurant.tagline) {
    ctx.font = "18px system-ui, sans-serif";
    drawLines(ctx, model.restaurant.tagline, metrics.width / 2, metrics.height / 2 + 205, 640, 24, 3);
  }
  ctx.textAlign = "left";
  return canvas.toDataURL("image/png");
};

export const createMenuPrintPdf = async (model, { signal, onProgress } = {}) => {
  checkpoint(signal);
  if (!model?.sections?.length) throw new Error("Select at least one available dish before creating a PDF.");
  if (typeof document === "undefined") throw new Error("PDF creation needs a browser window.");
  const metrics = pageMetrics(model.settings);
  const assets = await preloadImages(model, signal, onProgress);
  checkpoint(signal);
  const layout = paginateMenuPrintModel(model, metrics);
  const artwork = [];
  if (model.settings.layout === "booklet" && model.settings.includeCover) artwork.push(drawCover(model, metrics, assets.images));
  for (let index = 0; index < layout.length; index += 1) {
    checkpoint(signal);
    artwork.push(drawDocumentPage({ entries: layout[index], model, metrics, pageNumber: artwork.length + 1, images: assets.images, isFirstContentPage: index === 0 }));
    onProgress?.({ stage: "pages", completed: index + 1, total: layout.length, failed: assets.failed });
    await yieldWork();
  }
  checkpoint(signal);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: metrics.mm, compress: true });
  artwork.forEach((dataUrl, index) => {
    if (index) pdf.addPage(metrics.mm, "portrait");
    pdf.addImage(dataUrl, "PNG", 0, 0, metrics.mm[0], metrics.mm[1], undefined, "FAST");
  });
  return { blob: pdf.output("blob"), pages: artwork, imageFailures: assets.failed };
};

export const menuPrintFilename = (model) => `${String(model.restaurant.name || "menu")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "menu"}-menu.pdf`;
