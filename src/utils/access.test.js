import { describe, expect, it } from "vitest";
import { isRoleAllowed, normalizeRole } from "./access";

describe("role access", () => {
  it("normalizes backend role casing safely", () => {
    expect(normalizeRole(" Kitchen ")).toBe("kitchen");
    expect(isRoleAllowed("OWNER", ["owner", "superadmin"])).toBe(true);
  });

  it("rejects missing and unrelated roles", () => {
    expect(isRoleAllowed(null, ["owner"])).toBe(false);
    expect(isRoleAllowed("staff", ["owner", "superadmin"])).toBe(false);
  });

  it("allows authenticated routes without a role restriction", () => {
    expect(isRoleAllowed("staff")).toBe(true);
  });
});
