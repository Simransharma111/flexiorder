import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAuthSession,
  clearSessionForUnauthorizedResponse,
  isTokenExpired,
  isUnauthorizedResponse,
  readJwtPayload,
  readStoredSession,
  saveAuthSession,
} from "./session";

const createStorage = () => {
  const values = new Map();
  return {
    getItem: vi.fn((key) => values.get(key) ?? null),
    setItem: vi.fn((key, value) => values.set(key, String(value))),
    removeItem: vi.fn((key) => values.delete(key)),
    clear: vi.fn(() => values.clear()),
  };
};

const tokenWithPayload = (payload) => {
  const encoded = btoa(JSON.stringify(payload))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `header.${encoded}.signature`;
};

describe("session utilities", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads JWT payloads and detects expiry", () => {
    const token = tokenWithPayload({ sub: "staff-1", exp: 100 });
    expect(readJwtPayload(token)).toMatchObject({ sub: "staff-1" });
    expect(isTokenExpired(token, 100_000)).toBe(true);
    expect(isTokenExpired(token, 99_000)).toBe(false);
  });

  it("does not reject opaque legacy tokens", () => {
    expect(readJwtPayload("opaque-token")).toBeNull();
    expect(isTokenExpired("opaque-token")).toBe(false);
    expect(isTokenExpired("broken.jwt.token")).toBe(true);
  });

  it("persists and clears only authentication data", () => {
    localStorage.setItem("cart_qr-1", "saved-cart");
    saveAuthSession({ role: "staff" }, "opaque-token");
    expect(readStoredSession().user).toEqual({ role: "staff" });
    expect(localStorage.getItem("role")).toBe("staff");
    expect(readStoredSession()).toEqual({ token: "opaque-token", user: { role: "staff" } });

    clearAuthSession({ notify: false });
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(localStorage.getItem("role")).toBeNull();
    expect(localStorage.getItem("cart_qr-1")).toBe("saved-cart");
  });

  it("removes malformed stored users", () => {
    localStorage.setItem("token", "opaque-token");
    localStorage.setItem("user", "not-json");
    expect(readStoredSession()).toEqual({ token: null, user: null });
  });

  it("recognizes unauthorized API responses", () => {
    expect(isUnauthorizedResponse({ response: { status: 401 } })).toBe(true);
    expect(isUnauthorizedResponse({ response: { status: 403 } })).toBe(false);
    expect(isUnauthorizedResponse(new Error("offline"))).toBe(false);
  });

  it("clears stored authentication after a 401 response", () => {
    saveAuthSession({ role: "owner" }, "opaque-token");

    expect(clearSessionForUnauthorizedResponse({
      response: { status: 401 },
      config: { _flexiorderAuthToken: "opaque-token" },
    })).toBe(true);
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
  });

  it("does not clear a newer session after a stale 401 response", () => {
    saveAuthSession({ role: "owner" }, "new-token");

    expect(clearSessionForUnauthorizedResponse({
      response: { status: 401 },
      config: { _flexiorderAuthToken: "old-token" },
    })).toBe(false);
    expect(localStorage.getItem("token")).toBe("new-token");
  });

  it("falls back to an empty session when browser storage is unavailable", () => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => { throw new Error("blocked"); }),
      removeItem: vi.fn(() => { throw new Error("blocked"); }),
    });
    expect(readStoredSession()).toEqual({ token: null, user: null });
  });
});
