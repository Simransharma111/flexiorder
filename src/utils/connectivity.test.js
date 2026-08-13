import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getConnectivitySnapshot,
  reportApiFailure,
  reportApiSuccess,
  setConnectivitySyncing,
  startConnectivityMonitoring,
} from "./connectivity";

describe("connectivity signals", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("distinguishes API reachability from a browser online hint", () => {
    vi.stubGlobal("navigator", { onLine: true });
    reportApiFailure(new Error("network unavailable"));
    expect(getConnectivitySnapshot().reachability).toBe("offline");

    reportApiSuccess();
    expect(getConnectivitySnapshot()).toMatchObject({ reachability: "online" });

    reportApiFailure({ response: { status: 503 } });
    expect(getConnectivitySnapshot().reachability).toBe("online");
  });

  it("tracks syncing independently of reachability", () => {
    vi.stubGlobal("navigator", { onLine: true });
    reportApiSuccess();
    setConnectivitySyncing(true);
    expect(getConnectivitySnapshot()).toMatchObject({ reachability: "online", syncing: true });
    setConnectivitySyncing(false);
  });

  it("moves to connecting on browser recovery before claiming online", () => {
    const listeners = new Map();
    vi.stubGlobal("window", {
      addEventListener: vi.fn((name, listener) => listeners.set(name, listener)),
      removeEventListener: vi.fn(),
    });
    reportApiFailure(new Error("offline"));
    const stop = startConnectivityMonitoring();
    listeners.get("online")();
    expect(getConnectivitySnapshot().reachability).toBe("connecting");
    stop();
  });
});
