import { jsPDF } from "jspdf";
import brandLogo from "../assets/logo.png";

const MM_TO_PX = 5; // 127 dpi keeps A3 previews useful without huge memory pressure.
const FORMAT_MM = { A3: [297, 420], A4: [210, 297], A5: [148, 210] };

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
    brandLogo,
    model.restaurant.banner,
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
  return { images, failed: [...skipped, ...urls.filter((url) => url !== brandLogo && !images.has(url))] };
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

const continuedDish = (dish, changes) => ({ ...dish, ...changes, name: `${dish.name} (continued)`, image: "" });
const printableSections = (model) => model.settings.notes ? [...model.sections, {
  key: "__print-note__", name: "Please note", dishes: [{ id: "__print-note__", name: model.settings.notes,
    description: "", image: "", dietary: "", priceLabel: "", combo: null, subcategory: "", isPrintNote: true }],
}] : model.sections;

const design = (model, metrics) => {
  const scale = (model.settings.layout === "poster" ? 1.12 : 1) * (metrics.width > 1100 ? 1.24 : 1);
  const large = model.settings.textSize === "large" ? 1.18 : 1;
  const family = model.settings.textStyle === "classic" ? 'Georgia, "Times New Roman", serif' : 'system-ui, sans-serif';
  const size = 27 * scale * large;
  return { margin: metrics.width * .055, footer: 98, hero: metrics.height * .30, compact: 160,
    size, line: size * 1.3, small: size * .72, family,
    font: (factor = 1, weight = 600) => `${model.settings.textStyle === "bold" ? Math.max(weight, 700) : weight} ${size * factor}px ${family}` };
};

// Header and cover share bounded, top-aligned text boxes. Any metadata that
// cannot fit at readable size becomes ordinary paginated content, never lost.
export const measureMenuBranding = (ctx, model, metrics, images = new Map(), mode = "hero") => {
  const d = design(model, metrics);
  const cover = mode === "cover"; const hero = mode === "hero";
  const logo = model.settings.includeLogo && images.get(model.restaurant.logo);
  const logoSize = cover ? metrics.width * .25 : hero ? Math.min(180, metrics.width * .18) : 92;
  const x = d.margin + (!cover && logo ? logoDimensions(logo, logoSize).width + 28 : 0);
  const width = metrics.width - x - d.margin;
  const top = cover ? metrics.height * .52 : hero ? 38 : 24;
  const bottom = cover ? metrics.height - 125 : (hero ? d.hero : d.compact) - 23;
  const contact = model.settings.includeContact
    ? [model.restaurant.address, model.restaurant.phone, model.restaurant.email, model.restaurant.website].filter(Boolean).join(" · ") : "";
  const metadata = cover ? [model.restaurant.tagline, contact].filter(Boolean).join(" · ") : hero ? contact : "";
  const metadataSize = d.size * (cover ? .7 : .58);
  const metadataLine = metadataSize * 1.3;
  ctx.font = `500 ${metadataSize}px ${d.family}`;
  const metadataLines = wrap(ctx, metadata, metrics.width - d.margin * 2);
  const metadataReserve = Math.min(metadataLines.length, cover ? 4 : 3) * metadataLine;
  const menuSize = d.size * (cover ? 1.1 : .66);
  const menuHeight = menuSize * 1.3;
  const titleBudget = Math.max(35, bottom - top - menuHeight - 34 - metadataReserve);
  let size = cover ? metrics.width * .068 : d.size * (hero ? 1.7 : 1.08);
  ctx.font = `800 ${size}px ${d.family}`;
  let titleLines = wrap(ctx, model.restaurant.name, width);
  const minimum = Math.min(size, 23);
  while (titleLines.length * size * 1.16 > titleBudget && size > minimum) {
    size = Math.max(minimum, size - 1); ctx.font = `800 ${size}px ${d.family}`;
    titleLines = wrap(ctx, model.restaurant.name, width);
  }
  const titleLimit = Math.max(1, Math.floor(titleBudget / (size * 1.16)));
  const titleOverflow = titleLines.length > titleLimit;
  titleLines = titleLines.slice(0, titleLimit);
  if (titleOverflow) {
    const last = titleLines.length - 1;
    while (ctx.measureText(`${titleLines[last]}…`).width > width && titleLines[last]) titleLines[last] = titleLines[last].slice(0, -1);
    titleLines[last] += "…";
  }
  const title = { lines: titleLines, x, y: top, font: ctx.font, line: size * 1.16 };
  const menuY = top + titleLines.length * title.line + 14;
  const metadataY = Math.max(menuY + menuHeight + 16, !cover && logo ? (hero ? 42 : 25) + logoSize + 16 : 0);
  const metadataFits = metadataY + metadataLines.length * metadataLine <= bottom;
  return { logo, logoSize, title, menu: { x, y: menuY, font: d.font(cover ? 1.1 : .66, 650) },
    metadata: { lines: metadataFits ? metadataLines : [], x: d.margin, y: metadataY, font: `500 ${metadataSize}px ${d.family}`, line: metadataLine },
    overflow: { name: titleOverflow ? model.restaurant.name : "", contact: !metadataFits && metadata ? contact : "", tagline: cover && !metadataFits ? model.restaurant.tagline : "" } };
};

const drawBrandText = (ctx, layout) => {
  ctx.textBaseline = "top";
  ctx.fillStyle = "#fffdf8"; ctx.font = layout.title.font;
  layout.title.lines.forEach((line, i) => ctx.fillText(line, layout.title.x, layout.title.y + i * layout.title.line));
  ctx.font = layout.menu.font; ctx.fillStyle = "#ffce99"; ctx.fillText("M E N U", layout.menu.x, layout.menu.y);
  ctx.font = layout.metadata.font; ctx.fillStyle = "#fffdf8";
  layout.metadata.lines.forEach((line, i) => ctx.fillText(line, layout.metadata.x, layout.metadata.y + i * layout.metadata.line));
  ctx.textBaseline = "alphabetic";
};

// One measured representation drives both pagination and painting. A row can be
// fragmented at any text line, including names, prices and single combo options.
const rowGeometry = (ctx, dish, model, width, d, images) => {
  const photo = model.settings.includePhotos && dish.image && (!images || images.has(dish.image));
  const imageWidth = photo ? d.size * 4.7 : 0;
  const padding = d.size * .55;
  const inner = width - padding * 2;
  const priceWidth = dish.isPrintNote ? 0 : inner * .29;
  const nameWidth = inner - imageWidth - priceWidth - (priceWidth ? padding : 0);
  const lines = (text, maxWidth, factor = 1, weight = 600, color = "#252521") => {
    ctx.font = d.font(factor, weight);
    return wrap(ctx, text, maxWidth).map((text) => ({ text, font: ctx.font, color, height: d.line * factor }));
  };
  const names = lines(dish.name, nameWidth, 1, 750);
  const priceParts = dish.priceLabel.split(" · was ");
  const prices = dish.isPrintNote ? [] : [
    ...lines(priceParts[0], priceWidth, 1, 800, "#873810"),
    ...(priceParts[1] ? lines(`was ${priceParts[1]}`, priceWidth, .7, 500, "#655b52") : []),
  ];
  const bands = Array.from({ length: Math.max(names.length, prices.length) }, (_, index) => ({
    left: names[index], right: prices[index], height: Math.max(names[index]?.height || 0, prices[index]?.height || 0),
  }));
  const append = (text, color = "#58554d", weight = 450) => bands.push(...lines(text, inner - imageWidth, .72, weight, color)
    .map((left) => ({ left, height: left.height })));
  if (model.settings.includeDietary && dish.dietary) append(dish.dietary, dish.dietary === "Egg" ? "#805313" : "#993c2b", 650);
  if (model.settings.includeDescriptions && dish.description) append(dish.description);
  if (dish.combo) {
    if (dish.combo.included.length) append(`Included: ${dish.combo.included.join(", ")}`);
    dish.combo.choices.forEach((choice) => append(`${choice.name} — ${choice.instruction}: ${choice.items.join(", ") || "not set"}`));
  }
  return { bands, padding, imageWidth, priceWidth, minHeight: photo ? d.size * 3.7 : 0 };
};

export const paginateMenuPrintModel = (model, metrics = pageMetrics(model.settings), images) => {
  if (metrics.width < 500 || metrics.height < 800) throw new Error("Page is too small for a readable menu.");
  let sections = printableSections(model);
  if (typeof document === "undefined") return fallbackPaginate({ ...model, sections });
  const ctx = makeCanvas({ width: 1, height: 1 }).getContext("2d");
  if (!ctx) return fallbackPaginate({ ...model, sections });
  const branding = [measureMenuBranding(ctx, model, metrics, images), measureMenuBranding(ctx, model, metrics, images, "compact")];
  if (model.settings.includeCover) branding.push(measureMenuBranding(ctx, model, metrics, images, "cover"));
  const overflow = Object.fromEntries(["name", "contact", "tagline"].map((key) => [key, branding.find((entry) => entry.overflow[key])?.overflow[key] || ""]));
  const metadata = [overflow.name, overflow.tagline, overflow.contact].filter(Boolean).join(" · ");
  if (metadata) sections = [...sections, { key: "__restaurant-details__", name: "Restaurant details", dishes: [{ id: "__restaurant-details__", name: metadata,
    description: "", image: "", dietary: "", priceLabel: "", combo: null, subcategory: "", isPrintNote: true }] }];
  const d = design(model, metrics);
  const width = metrics.width - d.margin * 2;
  const end = metrics.height - d.footer - 14;
  const pages = [];
  let page = [];
  let y = d.hero + 22;
  let priorSection;
  let priorSubcategory;
  const nextPage = () => { if (page.length) pages.push(page); page = []; y = d.compact + 22; priorSection = null; priorSubcategory = null; };
  const headingLines = (text, kind) => {
    const font = d.font(kind === "section" ? 1.05 : .72, 750);
    ctx.font = font;
    const height = d.line * (kind === "section" ? 1.05 : .72) + 16;
    return wrap(ctx, text, width - 28).map((text) => ({ kind, text, height, font }));
  };
  const appendHeading = (line) => { page.push({ ...line, y }); y += line.height; };
  sections.forEach((section) => section.dishes.forEach((dish) => {
    const geometry = rowGeometry(ctx, dish, model, width, d, images);
    const categoryLines = headingLines(section.name, "section");
    const subcategoryLines = dish.subcategory ? headingLines(dish.subcategory, "subcategory") : [];
    const allHeadings = [...categoryLines, ...subcategoryLines];
    const totalHeadingHeight = allHeadings.reduce((sum, line) => sum + line.height, 0);
    const fullHeight = geometry.padding * 2 + Math.max(geometry.minHeight, geometry.bands.reduce((sum, band) => sum + band.height, 0));
    const pendingHeadings = () => [...(priorSection !== section.key ? categoryLines : []),
      ...(dish.subcategory && (priorSection !== section.key || priorSubcategory !== dish.subcategory) ? subcategoryLines : [])];
    let cursor = 0;
    while (cursor < geometry.bands.length) {
      const continuation = cursor > 0;
      const continuationHeight = continuation ? d.line * .72 : 0;
      const needed = continuationHeight + geometry.padding * 2 + Math.max(geometry.minHeight, geometry.bands[cursor].height);
      let headings = pendingHeadings();
      let headingHeight = headings.reduce((sum, line) => sum + line.height, 0);
      const rowReserve = !continuation && fullHeight + totalHeadingHeight <= end - d.compact - 22 ? fullHeight : needed;
      if (page.length && y + headingHeight + rowReserve > end) {
        nextPage(); headings = pendingHeadings(); headingHeight = totalHeadingHeight;
      }
      if (y + headingHeight + needed <= end) {
        headings.forEach(appendHeading);
      } else {
        // Exceptional multi-page headings retain every line. On the final row
        // page restore concise category/subcategory context without repeating
        // the entire oversized heading and risking a pagination loop.
        headings.forEach((line) => {
          if (y + line.height > end) nextPage();
          appendHeading(line);
        });
        const context = [categoryLines[0], subcategoryLines[0]].filter(Boolean);
        const contextHeight = context.reduce((sum, line) => sum + line.height, 0);
        if (y + needed + contextHeight > end) nextPage();
        if (!page.some((entry) => entry.kind === "section")) appendHeading(context[0]);
        if (subcategoryLines.length && !page.some((entry) => entry.kind === "subcategory")) appendHeading(context[1]);
      }
      priorSection = section.key; priorSubcategory = dish.subcategory || null;
      let height = geometry.padding * 2 + continuationHeight;
      const bands = [];
      while (cursor < geometry.bands.length && y + Math.max(height + geometry.bands[cursor].height, geometry.minHeight + geometry.padding * 2) <= end) {
        bands.push(geometry.bands[cursor++]); height += bands[bands.length - 1].height;
      }
      if (!bands.length) throw new Error("Menu content cannot fit this paper size. Choose a larger paper size.");
      height = Math.max(height, geometry.minHeight + geometry.padding * 2);
      page.push({ section, dish, geometry: { ...geometry, bands }, y, height, continuation });
      y += height + 12;
      if (cursor < geometry.bands.length) nextPage();
    }
  }));
  if (page.length) pages.push(page);
  return pages;
};

const logoDimensions = (logo, size) => ({ width: logo && logo.naturalWidth / logo.naturalHeight > 1.5 ? size * 1.65 : size, height: size });
const drawLogo = (ctx, logo, x, y, size) => {
  const { width, height } = logoDimensions(logo, size);
  ctx.fillStyle = "#fffdf8"; ctx.beginPath(); ctx.roundRect(x, y, width, height, size * .10); ctx.fill();
  if (!logo) return;
  const ratio = Math.min(width * .88 / logo.naturalWidth, height * .88 / logo.naturalHeight);
  const w = logo.naturalWidth * ratio; const h = logo.naturalHeight * ratio;
  ctx.drawImage(logo, x + (width - w) / 2, y + (height - h) / 2, w, h);
};

const drawFooter = (ctx, metrics, images, number) => {
  const x = metrics.width * .055; const y = metrics.height - 85;
  ctx.fillStyle = "#fffdf8"; ctx.fillRect(0, y - 8, metrics.width, 93);
  ctx.strokeStyle = "#d6c7b7"; ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(metrics.width - x, y - 8); ctx.stroke();
  const brand = images.get(brandLogo);
  // The bundled square asset includes its own wordmark and whitespace. Use its
  // cup emblem at a useful size, with a crisp canvas wordmark beside it.
  if (brand) ctx.drawImage(brand, 85, 45, 535, 440, x, y + 6, 72, 59);
  ctx.fillStyle = "#174d36"; ctx.font = "750 26px system-ui, sans-serif";
  ctx.fillText("FlexiOrder", x + (brand ? 83 : 0), y + 43);
  ctx.fillStyle = "#6a625b"; ctx.font = "500 18px system-ui, sans-serif";
  ctx.textAlign = "right"; ctx.fillText(String(number), metrics.width - x, y + 42); ctx.textAlign = "left";
};

const drawHeader = (ctx, model, metrics, images, hero) => {
  const d = design(model, metrics); const height = hero ? d.hero : d.compact;
  ctx.fillStyle = "#233c32"; ctx.fillRect(0, 0, metrics.width, height);
  const banner = images.get(model.restaurant.banner);
  if (banner && hero) {
    drawImageCover(ctx, banner, 0, 0, metrics.width, height);
    const gradient = ctx.createLinearGradient(0, 0, metrics.width, height);
    gradient.addColorStop(0, "rgba(15,30,23,.84)"); gradient.addColorStop(1, "rgba(15,30,23,.30)");
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, metrics.width, height);
  }
  const layout = measureMenuBranding(ctx, model, metrics, images, hero ? "hero" : "compact");
  if (layout.logo) drawLogo(ctx, layout.logo, d.margin, hero ? 42 : 25, layout.logoSize);
  drawBrandText(ctx, layout);
  ctx.fillStyle = "#de803d"; ctx.fillRect(0, height - 7, metrics.width, 7);
};

const drawDocumentPage = ({ entries, model, metrics, pageNumber, images, isFirstContentPage }) => {
  const { canvas, ctx } = pageBase(metrics); const d = design(model, metrics);
  const width = metrics.width - d.margin * 2;
  drawHeader(ctx, model, metrics, images, isFirstContentPage);
  entries.forEach((entry) => {
    const { y, height } = entry;
    if (entry.kind) {
      ctx.fillStyle = entry.kind === "section" ? "#ecdcc8" : "#fffdf8";
      ctx.beginPath(); ctx.roundRect(d.margin, y, width, height - 5, 7); ctx.fill();
      ctx.font = entry.font; ctx.fillStyle = "#51402e"; ctx.textBaseline = "top";
      ctx.fillText(entry.text, d.margin + 14, y + 5); ctx.textBaseline = "alphabetic";
      return;
    }
    const { dish, geometry } = entry;
    ctx.fillStyle = "#f7f0e5"; ctx.beginPath(); ctx.roundRect(d.margin, y, width, height, 10); ctx.fill();
    ctx.fillStyle = "#c77b3a"; ctx.fillRect(d.margin, y + 12, 3, height - 24);
    const photo = images.get(dish.image);
    if (photo && geometry.imageWidth) drawImageCover(ctx, photo, d.margin + geometry.padding, y + geometry.padding, geometry.imageWidth - 18, geometry.minHeight, 8);
    let lineY = y + geometry.padding;
    ctx.textBaseline = "top";
    if (entry.continuation) {
      ctx.font = d.font(.6, 650); ctx.fillStyle = "#756451";
      const labels = wrap(ctx, `Continued · ${dish.name}`, width - geometry.padding * 2 - geometry.imageWidth - 20);
      const label = labels[0] + (labels.length > 1 ? "…" : "");
      ctx.fillText(label, d.margin + geometry.padding + geometry.imageWidth, lineY);
      lineY += d.line * .72;
    }
    geometry.bands.forEach(({ left, right, height: lineHeight }) => {
      if (left) { ctx.font = left.font; ctx.fillStyle = left.color; ctx.fillText(left.text, d.margin + geometry.padding + geometry.imageWidth, lineY); }
      if (right) { ctx.font = right.font; ctx.fillStyle = right.color; ctx.textAlign = "right";
        ctx.fillText(right.text, metrics.width - d.margin - geometry.padding, lineY); ctx.textAlign = "left"; }
      lineY += lineHeight;
    });
    ctx.textBaseline = "alphabetic";
  });
  drawFooter(ctx, metrics, images, pageNumber);
  return canvas.toDataURL("image/png");
};

const drawCover = (model, metrics, images) => {
  const { canvas, ctx } = pageBase(metrics); const d = design(model, metrics);
  ctx.fillStyle = "#233c32"; ctx.fillRect(0, 0, metrics.width, metrics.height);
  const banner = images.get(model.restaurant.banner);
  if (banner) drawImageCover(ctx, banner, 0, 0, metrics.width, metrics.height);
  const gradient = ctx.createLinearGradient(0, 0, 0, metrics.height);
  gradient.addColorStop(0, "rgba(13,27,20,.15)"); gradient.addColorStop(.48, "rgba(13,27,20,.46)"); gradient.addColorStop(1, "rgba(13,27,20,.96)");
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, metrics.width, metrics.height);
  const layout = measureMenuBranding(ctx, model, metrics, images, "cover");
  if (layout.logo) drawLogo(ctx, layout.logo, d.margin, metrics.height * .14, layout.logoSize);
  drawBrandText(ctx, layout);
  drawFooter(ctx, metrics, images, 1);
  return canvas.toDataURL("image/png");
};

export const createMenuPrintPdf = async (model, { signal, onProgress } = {}) => {
  checkpoint(signal);
  if (!model?.sections?.length) throw new Error("Select at least one available dish before creating a PDF.");
  if (typeof document === "undefined") throw new Error("PDF creation needs a browser window.");
  const metrics = pageMetrics(model.settings);
  const assets = await preloadImages(model, signal, onProgress);
  checkpoint(signal);
  const layout = paginateMenuPrintModel(model, metrics, assets.images);
  const artwork = [];
  if (model.settings.includeCover) artwork.push(drawCover(model, metrics, assets.images));
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
