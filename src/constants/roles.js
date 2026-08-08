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
    case "kitchen":
      return "/kitchen";
    default:
      return "/";
  }
};
