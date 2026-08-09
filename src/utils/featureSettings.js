const STORAGE_PREFIX = "flexiorder_feature_settings";

export const APP_LEVELS = [
  { id: "simple", label: "Simple", description: "Orders, menu, QR and daily work" },
  { id: "basic", label: "Basic", description: "Adds staff, reports and service controls" },
  { id: "advanced", label: "Advanced", description: "Adds bulk tools and menu data controls" },
];

export const DEFAULT_FEATURE_SETTINGS = {
  appLevel: "basic",
  publicDisplayEnabled: false,
  staffCapabilities: {
    editMenu: true,
    changeOrdering: true,
    switchWorkspaces: true,
    usePublicDisplay: true,
  },
};

const hotelIdOf = (hotel) => String(hotel?._id || hotel?.id || "unknown");
const storageKey = (hotel) => `${STORAGE_PREFIX}:${hotelIdOf(hotel)}`;

const readLocalSettings = (hotel) => {
  if (!hotel?._id && !hotel?.id) return {};
  try {
    return JSON.parse(localStorage.getItem(storageKey(hotel)) || "{}");
  } catch {
    return {};
  }
};

export const normalizeFeatureSettings = (settings = {}) => {
  const appLevel = APP_LEVELS.some((level) => level.id === settings.appLevel)
    ? settings.appLevel
    : DEFAULT_FEATURE_SETTINGS.appLevel;
  return {
    ...DEFAULT_FEATURE_SETTINGS,
    ...settings,
    appLevel,
    publicDisplayEnabled: Boolean(settings.publicDisplayEnabled),
    staffCapabilities: {
      ...DEFAULT_FEATURE_SETTINGS.staffCapabilities,
      ...(settings.staffCapabilities || {}),
    },
  };
};

export const getFeatureSettings = (hotel) => {
  const localSettings = readLocalSettings(hotel);
  const serverSettings = hotel?.featureSettings || Object.fromEntries(
    Object.entries({
      appLevel: hotel?.appLevel,
      publicDisplayEnabled: hotel?.publicDisplayEnabled,
      staffCapabilities: hotel?.staffCapabilities,
    }).filter(([, value]) => value !== undefined)
  );
  return normalizeFeatureSettings({
    ...localSettings,
    ...serverSettings,
    staffCapabilities: {
      ...(localSettings?.staffCapabilities || {}),
      ...(serverSettings?.staffCapabilities || {}),
    },
  });
};

export const hydrateHotelFeatures = (hotel) => hotel
  ? { ...hotel, featureSettings: getFeatureSettings(hotel) }
  : hotel;

export const persistFeatureSettings = (hotel, settings) => {
  const normalized = normalizeFeatureSettings(settings);
  if (hotel?._id || hotel?.id) {
    try {
      localStorage.setItem(storageKey(hotel), JSON.stringify(normalized));
    } catch {
      // Server persistence still remains available when storage is restricted.
    }
  }
  return normalized;
};

export const appLevelAllows = (currentLevel, requiredLevel = "simple") => {
  const rank = { simple: 0, basic: 1, advanced: 2 };
  return (rank[currentLevel] ?? rank.basic) >= (rank[requiredLevel] ?? rank.simple);
};

const CAPABILITY_MINIMUM_LEVEL = {
  editMenu: "basic",
  changeOrdering: "basic",
  switchWorkspaces: "simple",
  usePublicDisplay: "basic",
};

export const canUseStaffCapability = (hotel, capability, role) => {
  if (["owner", "superadmin"].includes(String(role || "").toLowerCase())) return true;
  const settings = getFeatureSettings(hotel);
  return appLevelAllows(
    settings.appLevel,
    CAPABILITY_MINIMUM_LEVEL[capability] || "basic"
  ) && settings.staffCapabilities[capability] !== false;
};
