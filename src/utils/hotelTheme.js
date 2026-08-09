import HOTEL_THEMES from "../constants/hotelThemes";

const FALLBACK_THEME = HOTEL_THEMES.mint_glow;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const validColor = (value, fallback) =>
  typeof value === "string" && HEX_COLOR.test(value) ? value : fallback;

const mixHex = (color, target, amount) => {
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

const contrastRatio = (first, second) => {
  const lighter = Math.max(luminance(first), luminance(second));
  const darker = Math.min(luminance(first), luminance(second));
  return (lighter + 0.05) / (darker + 0.05);
};

const readableText = (color) => {
  const dark = "#17201d";
  const light = "#ffffff";
  return contrastRatio(color, dark) >= contrastRatio(color, light) ? dark : light;
};

export const resolveHotelTheme = (hotel) => {
  const saved = hotel?.theme || {};
  const id = saved.id || saved.themeId;
  const preset = HOTEL_THEMES[id] || FALLBACK_THEME;
  const primary = validColor(saved.primary || saved.primaryColor, preset.primary);
  const secondary = validColor(saved.secondary || saved.secondaryColor, preset.secondary);
  const accent = validColor(saved.accent || saved.accentColor, preset.accent);
  const legacyPrimary = !id ? primary : null;
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
    mode: saved.mode || preset.mode,
    onAccent: readableText(brand),
  };
};

export const getHotelThemeStyle = (hotel) => {
  const theme = resolveHotelTheme(hotel);
  return {
    "--primary": theme.brand,
    "--primary-dark": mixHex(theme.brand, "#000000", 0.24),
    "--primary-light": mixHex(theme.brand, "#ffffff", 0.86),
    "--guest-brand": theme.brand,
    "--theme-surface": theme.primary,
    "--theme-canvas": theme.secondary,
    "--theme-text": theme.text,
    "--theme-on-primary": theme.onAccent,
    "--theme-border": mixHex(theme.text, theme.primary, 0.82),
  };
};
