import { normalizeRole } from "../utils/access";

export const OWNER_ROLES = ["owner", "superadmin"];
export const RESTAURANT_ROLES = [
  "staff",
  "manager",
  "kitchen",
  "cashier",
  "owner",
  "superadmin",
];

export const getHomePathForRole = (role) => {
  switch (normalizeRole(role)) {
    case "superadmin":
      return "/superadmin";
    case "owner":
      return "/owner/dashboard";
    case "manager":
    case "cashier":
      return "/owner/order";
    case "staff":
      return "/owner/order";
    case "kitchen":
      return "/kitchen";
    default:
      return "/";
  }
};

export const getPostLoginPath = (role, requestedPath) => {
  const normalizedRole = normalizeRole(role);
  const home = getHomePathForRole(normalizedRole);
  const safePath = typeof requestedPath === "string" &&
    requestedPath.startsWith("/") &&
    !requestedPath.startsWith("//")
      ? (requestedPath.replace(/\/+$/, "") || "/")
      : null;

  if (!safePath) return home;
  if (normalizedRole === "owner") {
    return safePath.startsWith("/owner/") && safePath !== "/owner/order"
      ? safePath
      : home;
  }
  if (normalizedRole === "superadmin") {
    return safePath.startsWith("/superadmin") || safePath.startsWith("/owner/")
      ? safePath
      : home;
  }
  if (["staff", "kitchen", "manager", "cashier"].includes(normalizedRole)) {
    return ["/kitchen", "/owner/order"].includes(safePath) ? safePath : home;
  }
  return home;
};
