export const HOTEL_THEME_CHOICES = [
  {
    id: "sunrise_bliss",
    label: "Sunrise Bliss",
    primary: "#ffffff",
    secondary: "#fff7ed",
    accent: "#f6ad55",
    brand: "#f6ad55",
    text: "#111827",
    mode: "light",
  },
  {
    id: "mint_glow",
    label: "Mint Glow",
    primary: "#ffffff",
    secondary: "#ecfdf5",
    accent: "#34d399",
    brand: "#34d399",
    text: "#111827",
    mode: "light",
  },
  {
    id: "skywave",
    label: "Sky Wave",
    primary: "#ffffff",
    secondary: "#eff6ff",
    accent: "#60a5fa",
    brand: "#60a5fa",
    text: "#111827",
    mode: "light",
  },
  {
    id: "lavender_hues",
    label: "Lavender Hues",
    primary: "#ffffff",
    secondary: "#f5f3ff",
    accent: "#a78bfa",
    brand: "#a78bfa",
    text: "#111827",
    mode: "light",
  },
  {
    id: "midnight_moss",
    label: "Midnight Moss",
    primary: "#0f172a",
    secondary: "#1e293b",
    accent: "#22c55e",
    brand: "#0f172a",
    text: "#e2e8f0",
    mode: "dark",
  },
];

const LEGACY_THEMES = [
  ["velvet_sunset", "Velvet Sunset", "#F97316", "#1F0A0A", "#FDBA74", "#FFF7ED"],
  ["emerald_luxe", "Emerald Luxe", "#0F766E", "#79c19d", "#1b8a61", "#042F2E"],
  ["ocean_breeze", "Ocean Breeze", "#2563EB", "#0F172A", "#7DD3FC", "#EFF6FF"],
  ["royal_plum", "Royal Plum", "#7C3AED", "#1F123A", "#C4B5FD", "#F5F3FF"],
  ["citrus_glow", "Citrus Glow", "#D97706", "#3B1300", "#FDE68A", "#FFFBEB"],
  ["sage_ritual", "Sage Ritual", "#edefea", "#d7dd7b", "#A3E635", "#060801"],
  ["midnight_noir", "Midnight Noir", "#111827", "#030712", "#64748B", "#F8FAFC"],
  ["pearl_mist", "Pearl Mist", "#F8FAFC", "#E2E8F0", "#475569", "#0F172A"],
  ["instagram_inspo", "Instagram Inspo", "#FF4D67", "#FFF5F7", "#1DA1F2", "#1F2937"],
].map(([id, label, primary, secondary, accent, text]) => ({
  id,
  label,
  primary,
  secondary,
  accent,
  brand: primary,
  text,
  mode: ["midnight_noir", "velvet_sunset", "ocean_breeze", "royal_plum", "citrus_glow"].includes(id)
    ? "dark"
    : "light",
  legacy: true,
}));

const HOTEL_THEMES = Object.fromEntries(
  [...HOTEL_THEME_CHOICES, ...LEGACY_THEMES].map((theme) => [theme.id, theme])
);

export default HOTEL_THEMES;
