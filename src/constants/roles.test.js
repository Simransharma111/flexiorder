import { describe, expect, it } from "vitest";
import { getHomePathForRole, getPostLoginPath, OWNER_ROLES, RESTAURANT_ROLES } from "./roles";

describe("role routing", () => {
  it("routes supported restaurant roles to operational screens", () => {
    expect(getHomePathForRole("owner")).toBe("/owner/dashboard");
    expect(getHomePathForRole("manager")).toBe("/owner/order");
    expect(getHomePathForRole("cashier")).toBe("/owner/order");
    expect(getHomePathForRole("kitchen")).toBe("/kitchen");
    expect(getHomePathForRole("staff")).toBe("/owner/order");
  });

  it("keeps owner-only and restaurant-wide roles explicit", () => {
    expect(OWNER_ROLES).toEqual(["owner", "superadmin"]);
    expect(RESTAURANT_ROLES).toContain("manager");
    expect(RESTAURANT_ROLES).toContain("cashier");
  });

  it("never returns an owner to a kitchen or waiter login redirect", () => {
    expect(getPostLoginPath("owner", "/kitchen")).toBe("/owner/dashboard");
    expect(getPostLoginPath("owner", "/owner/order")).toBe("/owner/dashboard");
    expect(getPostLoginPath("owner", "/owner/hotel/settings")).toBe("/owner/hotel/settings");
    expect(getPostLoginPath("staff", "/kitchen")).toBe("/kitchen");
  });

  it("normalizes redirects and preserves authorized owner tools", () => {
    expect(getPostLoginPath("owner", "/owner/order/")).toBe("/owner/dashboard");
    expect(getPostLoginPath("superadmin", "/owner/hotel/settings")).toBe("/owner/hotel/settings");
  });
});
