const STORAGE_PREFIX = "flexiorder_feature_settings";

export const APP_LEVELS = [
  { id: "simple", label: "Simple", description: "Orders, menu, QR and daily work" },
  { id: "basic", label: "Basic", description: "Everything in Simple, plus staff, analytics and service controls" },
  { id: "advanced", label: "Advanced", description: "Everything in Basic, plus exports, bulk menu tools and merchandising" },
];

export const FEATURE_REGISTRY = [
  { id: "today", label: "Live restaurant overview", minimumLevel: "simple", group: "Operations" },
  { id: "menu", label: "Menu and availability", minimumLevel: "simple", group: "Operations" },
  { id: "orderHistory", label: "Order history", minimumLevel: "simple", group: "Operations" },
  { id: "settings", label: "Restaurant settings", minimumLevel: "simple", group: "Operations" },
  { id: "qrTables", label: "QR tables", minimumLevel: "simple", group: "Operations" },
  { id: "qrInventory", label: "QR inventory generation", minimumLevel: "simple", group: "Operations" },
  { id: "workspaceSwitch", label: "Waiter and Kitchen workspaces", minimumLevel: "simple", group: "Operations" },
  { id: "staffManagement", label: "Staff management", minimumLevel: "basic", group: "Team & service" },
  { id: "analytics", label: "Restaurant analytics", minimumLevel: "basic", group: "Team & service" },
  { id: "menuEditing", label: "Staff menu editing", minimumLevel: "basic", group: "Team & service" },
  { id: "orderingControls", label: "Customer ordering controls", minimumLevel: "basic", group: "Team & service" },
  { id: "publicDisplay", label: "Public order display", minimumLevel: "basic", group: "Team & service" },
  { id: "menuImport", label: "Bulk menu import", minimumLevel: "advanced", group: "Advanced tools" },
  { id: "menuExport", label: "Menu backup export", minimumLevel: "advanced", group: "Advanced tools" },
  { id: "menuMerchandising", label: "Featured and promotional dish sections", minimumLevel: "advanced", group: "Advanced tools" },
  { id: "menuPriority", label: "Custom menu priority", minimumLevel: "advanced", group: "Advanced tools" },
  { id: "analyticsExport", label: "Daily analytics CSV export", minimumLevel: "advanced", group: "Advanced tools" },
];

export const DEFAULT_FEATURE_SETTINGS = {
  appLevel: "basic",
  publicDisplayEnabled: false,
  godModeEnabled: false,
  staffCapabilities: {
    editMenu: false,
    changeOrdering: false,
    switchWorkspaces: true,
    usePublicDisplay: false,
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
    godModeEnabled: typeof settings.godModeEnabled === "boolean"
      ? settings.godModeEnabled
      : DEFAULT_FEATURE_SETTINGS.godModeEnabled,
    staffCapabilities: {
      ...DEFAULT_FEATURE_SETTINGS.staffCapabilities,
      ...(settings.staffCapabilities || {}),
    },
  };
};

export const getFeatureSettings = (hotel) => {
  const localSettings = readLocalSettings(hotel);
  const legacySettings = Object.fromEntries(
    Object.entries({
      appLevel: hotel?.appLevel,
      publicDisplayEnabled: hotel?.publicDisplayEnabled,
      godModeEnabled: hotel?.godModeEnabled,
      staffCapabilities: hotel?.staffCapabilities,
    }).filter(([, value]) => value !== undefined)
  );
  const serverSettings = {
    ...legacySettings,
    ...(hotel?.featureSettings || {}),
    staffCapabilities: {
      ...(legacySettings.staffCapabilities || {}),
      ...(hotel?.featureSettings?.staffCapabilities || {}),
    },
  };
  return normalizeFeatureSettings({
    ...localSettings,
    ...serverSettings,
    staffCapabilities: {
      ...(localSettings?.staffCapabilities || {}),
      ...(serverSettings?.staffCapabilities || {}),
    },
  });
};

export const applyHotelSettingsUpdate = (hotel, update) => {
  if (!hotel || !update) return hotel;
  if (update.hotel != null && typeof update.hotel !== "object") return hotel;
  const updateHotel = update.hotel && typeof update.hotel === "object" ? update.hotel : update;
  const currentId = hotelIdOf(hotel);
  const updateId = String(update.hotelId || updateHotel?._id || updateHotel?.id || "");
  if (!updateId || currentId === "unknown" || updateId !== currentId) return hotel;
  const incomingUpdatedAt = update.updatedAt || updateHotel?.updatedAt;
  const currentUpdatedAt = hotel.updatedAt;
  if (incomingUpdatedAt && !Number.isFinite(Date.parse(incomingUpdatedAt))) {
    return hotel;
  }
  if (
    incomingUpdatedAt &&
    currentUpdatedAt &&
    Number.isFinite(Date.parse(incomingUpdatedAt)) &&
    Number.isFinite(Date.parse(currentUpdatedAt)) &&
    Date.parse(incomingUpdatedAt) < Date.parse(currentUpdatedAt)
  ) return hotel;

  const rawFeatureSettings = update.featureSettings || updateHotel?.featureSettings;
  const incomingFeatureSettings = rawFeatureSettings &&
    typeof rawFeatureSettings === "object" &&
    !Array.isArray(rawFeatureSettings)
    ? rawFeatureSettings
    : null;
  const legacyGodMode = update.godModeEnabled ?? updateHotel?.godModeEnabled;
  const incomingOrdering = update.orderingEnabled ?? updateHotel?.orderingEnabled;
  const incomingMenuMode = update.menuMode ?? updateHotel?.menuMode;
  const incomingGstEnabled = update.gstEnabled ?? updateHotel?.gstEnabled;
  const incomingGstPercentage = update.gstPercentage ?? updateHotel?.gstPercentage;
  const hasMenuMode = ["visual", "simple"].includes(incomingMenuMode);
  const hasGstEnabled = typeof incomingGstEnabled === "boolean";
  const hasGstPercentage = typeof incomingGstPercentage === "number" &&
    Number.isFinite(incomingGstPercentage) &&
    incomingGstPercentage >= 0 &&
    incomingGstPercentage <= 100;
  if (
    !incomingFeatureSettings &&
    typeof legacyGodMode !== "boolean" &&
    typeof incomingOrdering !== "boolean" &&
    !hasMenuMode &&
    !hasGstEnabled &&
    !hasGstPercentage
  ) return hotel;

  const featureSettings = normalizeFeatureSettings({
    ...getFeatureSettings(hotel),
    ...(incomingFeatureSettings || {}),
    ...(typeof legacyGodMode === "boolean" ? { godModeEnabled: legacyGodMode } : {}),
    staffCapabilities: {
      ...getFeatureSettings(hotel).staffCapabilities,
      ...(incomingFeatureSettings?.staffCapabilities || {}),
    },
  });
  return {
    ...hotel,
    ...(typeof incomingOrdering === "boolean"
      ? { orderingEnabled: incomingOrdering }
      : {}),
    ...(hasMenuMode ? { menuMode: incomingMenuMode } : {}),
    ...(hasGstEnabled ? { gstEnabled: incomingGstEnabled } : {}),
    ...(hasGstPercentage ? { gstPercentage: incomingGstPercentage } : {}),
    ...(incomingUpdatedAt ? { updatedAt: incomingUpdatedAt } : {}),
    featureSettings,
  };
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

export const featureEnabled = (currentLevel, featureId) => {
  const feature = FEATURE_REGISTRY.find((item) => item.id === featureId);
  return feature ? appLevelAllows(currentLevel, feature.minimumLevel) : false;
};

export const getFeaturesForLevel = (level, { inherited = true } = {}) =>
  FEATURE_REGISTRY.filter((feature) => inherited
    ? featureEnabled(level, feature.id)
    : feature.minimumLevel === level);

const CAPABILITY_MINIMUM_LEVEL = {
  editMenu: FEATURE_REGISTRY.find((item) => item.id === "menuEditing").minimumLevel,
  changeOrdering: FEATURE_REGISTRY.find((item) => item.id === "orderingControls").minimumLevel,
  switchWorkspaces: FEATURE_REGISTRY.find((item) => item.id === "workspaceSwitch").minimumLevel,
  usePublicDisplay: FEATURE_REGISTRY.find((item) => item.id === "publicDisplay").minimumLevel,
};

export const canUseStaffCapability = (hotel, capability, role) => {
  if (["owner", "superadmin"].includes(String(role || "").toLowerCase())) return true;
  const settings = getFeatureSettings(hotel);
  return appLevelAllows(
    settings.appLevel,
    CAPABILITY_MINIMUM_LEVEL[capability] || "basic"
  ) && settings.staffCapabilities[capability] !== false;
};
