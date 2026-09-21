import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  native: true,
  pushPermission: "granted",
  localPermission: "granted",
  listeners: new Map(),
  push: {
    createChannel: vi.fn().mockResolvedValue(),
    addListener: vi.fn(),
    checkPermissions: vi.fn(),
    requestPermissions: vi.fn(),
    register: vi.fn().mockResolvedValue(),
  },
  local: {
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    createChannel: vi.fn().mockResolvedValue(),
    checkPermissions: vi.fn(),
    requestPermissions: vi.fn(),
    schedule: vi.fn().mockResolvedValue(),
  },
  appAddListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
  deviceGetId: vi.fn().mockResolvedValue({ identifier: "install-123" }),
}));

vi.mock("@capacitor/core", () => ({ Capacitor: {
  isNativePlatform: () => mocks.native,
  getPlatform: () => "android",
} }));
vi.mock("@capacitor/push-notifications", () => ({ PushNotifications: mocks.push }));
vi.mock("@capacitor/local-notifications", () => ({ LocalNotifications: mocks.local }));
vi.mock("@capacitor/app", () => ({ App: { addListener: mocks.appAddListener } }));
vi.mock("@capacitor/device", () => ({ Device: { getId: mocks.deviceGetId } }));

const createStorage = () => {
  const values = new Map();
  return {
    getItem: vi.fn((key) => values.get(key) ?? null),
    setItem: vi.fn((key, value) => values.set(key, String(value))),
    removeItem: vi.fn((key) => values.delete(key)),
  };
};

const settle = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe("Android notification lifecycle", () => {
  let api;
  let windowTarget;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    mocks.native = true;
    mocks.pushPermission = "granted";
    mocks.localPermission = "granted";
    mocks.listeners.clear();
    mocks.push.checkPermissions.mockImplementation(async () => ({ receive: mocks.pushPermission }));
    mocks.push.requestPermissions.mockImplementation(async () => ({ receive: mocks.pushPermission }));
    mocks.local.checkPermissions.mockImplementation(async () => ({ display: mocks.localPermission }));
    mocks.local.requestPermissions.mockImplementation(async () => ({ display: mocks.localPermission }));
    mocks.push.addListener.mockImplementation(async (name, callback) => {
      mocks.listeners.set(name, callback);
      return { remove: vi.fn() };
    });
    vi.stubGlobal("localStorage", createStorage());
    vi.stubGlobal("sessionStorage", createStorage());
    localStorage.setItem("token", "auth-one");
    localStorage.setItem("user", JSON.stringify({ role: "owner" }));
    windowTarget = new EventTarget();
    windowTarget.location = { pathname: "/kitchen", assign: vi.fn() };
    vi.stubGlobal("window", windowTarget);
    vi.stubGlobal("CustomEvent", class extends Event {
      constructor(name, options) { super(name); this.detail = options?.detail; }
    });
    vi.stubGlobal("Audio", vi.fn(() => ({ volume: 0, play: vi.fn().mockResolvedValue() })));
    api = { post: vi.fn().mockResolvedValue({ data: { pushReady: true } }), delete: vi.fn().mockResolvedValue({}) };
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("registers one granted installation with the Android device contract", async () => {
    const { initFCM, getOrderNotificationStatus } = await import("./fcmPush");
    await initFCM(api);
    expect(mocks.push.register).toHaveBeenCalledOnce();
    await mocks.listeners.get("registration")({ value: "fcm-token-with-at-least-twenty-characters" });
    await settle();
    expect(api.post).toHaveBeenCalledWith("/notifications/save-token", {
      token: "fcm-token-with-at-least-twenty-characters",
      deviceId: "android-install-123",
      platform: "android",
    }, expect.objectContaining({ headers: { Authorization: "Bearer auth-one" } }));
    expect(getOrderNotificationStatus().state).toBe("enabled");
  });

  it("bounds asynchronous registrationError retries", async () => {
    const { initFCM, getOrderNotificationStatus } = await import("./fcmPush");
    await initFCM(api);
    for (const delay of [1000, 2000, 4000]) {
      mocks.listeners.get("registrationError")();
      await vi.advanceTimersByTimeAsync(delay);
    }
    mocks.listeners.get("registrationError")();
    await vi.advanceTimersByTimeAsync(60000);
    expect(mocks.push.register).toHaveBeenCalledTimes(4);
    expect(getOrderNotificationStatus().state).toBe("error");
  });

  it("serializes token rotation so an old save cannot retire the replacement", async () => {
    let finishOld;
    api.post.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }));
    const { initFCM } = await import("./fcmPush");
    await initFCM(api);
    const oldSave = mocks.listeners.get("registration")({ value: "old-token-with-at-least-twenty-characters" });
    await settle(); await settle();
    const newSave = mocks.listeners.get("registration")({ value: "new-token-with-at-least-twenty-characters" });
    await settle(); await settle();
    expect(api.post).toHaveBeenCalledTimes(1);
    finishOld({ data: { success: true } });
    await oldSave; await newSave;
    expect(api.post).toHaveBeenCalledTimes(2);
    expect(api.post.mock.calls[1][1].token).toBe("new-token-with-at-least-twenty-characters");
  });

  it("shows denied state and does not attempt registration", async () => {
    mocks.pushPermission = "denied";
    const { initFCM, getOrderNotificationStatus } = await import("./fcmPush");
    await initFCM(api);
    expect(mocks.push.register).not.toHaveBeenCalled();
    expect(getOrderNotificationStatus()).toMatchObject({ state: "denied" });
  });

  it("retries a transient token-save failure with capped backoff", async () => {
    api.post.mockRejectedValueOnce(new Error("offline")).mockResolvedValue({ data: { pushReady: true } });
    const { initFCM } = await import("./fcmPush");
    await initFCM(api);
    await mocks.listeners.get("registration")({ value: "retry-token-with-at-least-twenty-characters" });
    await settle();
    expect(api.post).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(api.post).toHaveBeenCalledTimes(2);
  });

  it("unregisters the old account and reassigns the same installation on login", async () => {
    const { initFCM, endNotificationSession } = await import("./fcmPush");
    await initFCM(api);
    mocks.listeners.get("registration")({ value: "shared-token-with-at-least-twenty-characters" });
    await settle();
    await endNotificationSession("auth-one");
    expect(api.delete).toHaveBeenCalledWith("/notifications/token", expect.objectContaining({
      data: { deviceId: "android-install-123" },
      headers: { Authorization: "Bearer auth-one" },
    }));
    localStorage.setItem("token", "auth-two");
    await initFCM(api);
    expect(api.post).toHaveBeenLastCalledWith("/notifications/save-token", expect.objectContaining({
      token: "shared-token-with-at-least-twenty-characters",
      deviceId: "android-install-123",
    }), expect.objectContaining({ headers: { Authorization: "Bearer auth-two" } }));
  });

  it("saves a refreshed FCM token for the same device", async () => {
    const { initFCM } = await import("./fcmPush");
    await initFCM(api);
    await mocks.listeners.get("registration")({ value: "first-token-with-at-least-twenty-characters" });
    await settle();
    await mocks.listeners.get("registration")({ value: "second-token-with-at-least-twenty-characters" });
    await settle();
    expect(api.post).toHaveBeenCalledTimes(2);
    expect(api.post.mock.calls[0][1].deviceId).toBe(api.post.mock.calls[1][1].deviceId);
  });

  it("deduplicates Socket and FCM foreground alerts and routes notification taps", async () => {
    const { initFCM, triggerLocalOrderNotification } = await import("./fcmPush");
    await initFCM(api);
    await triggerLocalOrderNotification({ _id: "order-42", items: [{ quantity: 1 }] });
    await mocks.listeners.get("pushNotificationReceived")({ data: { orderId: "order-42" } });
    expect(mocks.local.schedule).toHaveBeenCalledTimes(1);
    mocks.listeners.get("pushNotificationActionPerformed")({ notification: { data: { orderId: "order-42" } } });
    expect(window.location.assign).toHaveBeenCalledWith("/owner/dashboard");
  });
});
