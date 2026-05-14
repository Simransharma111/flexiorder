export const getTheme = (hotel) => {
  const THEME_MAP = {
    stormy_morning: { primary: "#64748B", secondary: "#0F172A" },
    mossy_hollow: { primary: "#4D7C0F", secondary: "#1A2E05" },
    blue_eclipse: { primary: "#1E293B", secondary: "#020617" },
    lush_forest: { primary: "#14532D", secondary: "#052E16" },
    green_juice: { primary: "#16A34A", secondary: "#052E16" },
    chili_spice: { primary: "#DC2626", secondary: "#1F0A0A" },
    chocolate_truffle: { primary: "#7C2D12", secondary: "#1C0A00" },
    ink_wash: { primary: "#111827", secondary: "#F8FAFC" },
  };

  const themeId = hotel?.theme?.themeId;

  const preset = THEME_MAP[themeId] || {};

  return {
    primary:
      hotel?.theme?.primaryColor ||
      preset.primary ||
      "#F97316",

    secondary:
      hotel?.theme?.secondaryColor ||
      preset.secondary ||
      "#0F172A",

    logo: hotel?.logo,
    coverImage: hotel?.coverImage,
  };
};