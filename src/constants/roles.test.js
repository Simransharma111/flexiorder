import { describe, expect, it } from "vitest";
import { getHomePathForRole, OWNER_ROLES, RESTAURANT_ROLES } from "./roles";

describe("role routing", () => {
  it("routes supported restaurant roles to operational screens", () => {
    expect(getHomePathForRole("owner")).toBe("/owner/dashboard");
    expect(getHomePathForRole("manager")).toBe("/owner/order");
    expect(getHomePathForRole("cashier")).toBe("/owner/order");
    expect(getHomePathForRole("kitchen")).toBe("/kitchen");
    expect(getHomePathForRole("staff")).toBe("/kitchen");
  });

  it("keeps owner-only and restaurant-wide roles explicit", () => {
    expect(OWNER_ROLES).toEqual(["owner", "superadmin"]);
    expect(RESTAURANT_ROLES).toContain("manager");
    expect(RESTAURANT_ROLES).toContain("cashier");
  });
});
