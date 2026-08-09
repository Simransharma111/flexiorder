import HOTEL_THEMES from "../constants/hotelThemes";

const FALLBACK_THEME = HOTEL_THEMES.mint_glow;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const validColor = (value, fallback) =>
  typeof value === "string" && HEX_COLOR.test(value) ? value : fallback;

export const mixHex = (color, target, amount) => {
  const source = validColor(color, FALLBACK_THEME.accent).slice(1);
  const destination = target.slice(1);
  const channels = [0, 2, 4].map((offset) => {
    const from = Number.parseInt(source.slice(offset, offset + 2), 16);
    const to = Number.parseInt(destination.slice(offset, offset + 2), 16);
    return Math.round(from + (to - from) * amount).toString(16).padStart(2, "0");
  });
  return `#${channels.join("")}`;
};

const luminance = (color) => {
  const hex = validColor(color, FALLBACK_THEME.accent).slice(1);
  const channels = [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

export const contrastRatio = (first, second) => {
  const lighter = Math.max(luminance(first), luminance(second));
  const darker = Math.min(luminance(first), luminance(second));
  return (lighter + 0.05) / (darker + 0.05);
};

const readableText = (color, preferred = "#17201d", minimum = 4.5) => {
  const dark = "#17201d";
  const light = "#f8fafc";
  if (contrastRatio(color, preferred) >= minimum) return preferred;
  return contrastRatio(color, dark) >= contrastRatio(color, light) ? dark : light;
};

const readableAcross = (colors, preferred) => {
  const candidates = [preferred, "#17201d", "#f8fafc"].filter(Boolean);
  return candidates.reduce((best, candidate) => {
    const score = Math.min(...colors.map((color) => contrastRatio(color, candidate)));
    const bestScore = Math.min(...colors.map((color) => contrastRatio(color, best)));
    return score > bestScore ? candidate : best;
  }, candidates[0]);
};

const softenedForeground = (foreground, background, minimum) => {
  let result = foreground;
  for (let amount = 0.05; amount <= 0.8; amount += 0.05) {
    const candidate = mixHex(foreground, background, amount);
    if (contrastRatio(candidate, background) < minimum) break;
    result = candidate;
  }
  return result;
};

const strengthenForeground = (color, background, toward, minimum) => {
  if (contrastRatio(color, background) >= minimum) return color;
  for (let amount = 0.1; amount <= 1; amount += 0.1) {
    const candidate = mixHex(color, toward, amount);
    if (contrastRatio(candidate, background) >= minimum) return candidate;
  }
  return toward;
};

export const resolveHotelTheme = (hotel) => {
  const saved = hotel?.theme || {};
  const id = saved.id || saved.themeId;
  const preset = HOTEL_THEMES[id] || FALLBACK_THEME;
  const brandOnlyLegacy = !id && (saved.primary || saved.primaryColor) &&
    !saved.secondary && !saved.secondaryColor && !saved.accent && !saved.accentColor && !saved.text;
  const primary = brandOnlyLegacy
    ? preset.primary
    : validColor(saved.primary || saved.primaryColor, preset.primary);
  const secondary = validColor(saved.secondary || saved.secondaryColor, preset.secondary);
  const accent = validColor(saved.accent || saved.accentColor, preset.accent);
  const legacyPrimary = !id
    ? validColor(saved.primary || saved.primaryColor, primary)
    : null;
  const brand = validColor(saved.brand || legacyPrimary || preset.brand, preset.brand || accent);
  const text = validColor(saved.text, preset.text);

  return {
    ...preset,
    id: id || preset.id,
    primary,
    secondary,
    accent,
    brand,
    text,
    mode: ["light", "dark"].includes(saved.mode) ? saved.mode : preset.mode,
    onAccent: readableText(brand),
  };
};

export const getHotelThemeStyle = (hotel) => {
  const theme = resolveHotelTheme(hotel);
  const savedSurface = validColor(theme.primary, FALLBACK_THEME.primary);
  const savedCanvas = validColor(theme.secondary, FALLBACK_THEME.secondary);
  const darkMode = theme.mode === "dark";
  const canvas = darkMode
    ? (luminance(savedCanvas) < 0.35 ? savedCanvas : "#16231f")
    : (luminance(savedCanvas) > 0.35 ? savedCanvas : FALLBACK_THEME.secondary);
  const modeSafeSurface = darkMode
    ? (luminance(savedSurface) < 0.35 ? savedSurface : "#1d2c27")
    : (luminance(savedSurface) > 0.35 ? savedSurface : FALLBACK_THEME.primary);
  const surface = theme.legacy && darkMode
    ? mixHex(canvas, "#ffffff", 0.08)
    : modeSafeSurface;
  const subtle = darkMode
    ? mixHex(surface, "#ffffff", 0.08)
    : mixHex(canvas, surface, 0.38);
  const ink = readableAcross([surface, canvas, subtle], theme.text);
  const muted = softenedForeground(ink, surface, 4.5);
  const disabled = softenedForeground(ink, surface, 3);
  const border = mixHex(ink, surface, darkMode ? 0.62 : 0.78);
  const borderStrong = mixHex(ink, surface, darkMode ? 0.42 : 0.58);
  const chartGrid = mixHex(ink, surface, darkMode ? 0.68 : 0.8);
  const primaryInk = readableText(theme.brand);
  const accentInk = strengthenForeground(theme.brand, surface, ink, 4.5);
  const chartSeries = strengthenForeground(theme.brand, surface, ink, 3);
  return {
    "--primary": theme.brand,
    "--primary-dark": mixHex(theme.brand, "#000000", 0.24),
    "--primary-light": mixHex(theme.brand, "#ffffff", 0.86),
    "--primary-ink": accentInk,
    "--guest-brand": theme.brand,
    "--theme-surface": surface,
    "--theme-canvas": canvas,
    "--theme-subtle": subtle,
    "--theme-text": ink,
    "--theme-text-secondary": muted,
    "--theme-text-disabled": disabled,
    "--theme-on-primary": primaryInk,
    "--theme-border": border,
    "--theme-border-strong": borderStrong,
    "--theme-chart-grid": chartGrid,
    "--theme-chart-series": chartSeries,
    "--ops-canvas": canvas,
    "--ops-card": surface,
    "--ops-subtle": subtle,
    "--ops-ink": ink,
    "--ops-muted": muted,
    "--ops-disabled": disabled,
    "--ops-border": border,
    "--ops-border-strong": borderStrong,
  };
};
