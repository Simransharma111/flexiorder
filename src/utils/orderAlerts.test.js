import { describe, expect, it } from "vitest";
import {
  createOrderAlertDeduper,
  notificationIdForKey,
  orderAlertKey,
  shouldRequestNotificationPermission,
} from "./orderAlerts";

describe("order alert identity", () => {
  it("uses the same order key for socket orders and Firebase payloads", () => {
    expect(orderAlertKey({ _id: "order-1" })).toBe("order-1");
    expect(orderAlertKey({ data: { orderId: "order-1" } })).toBe("order-1");
  });

  it("allows only one foreground alert per order during the dedupe window", () => {
    let time = 1000;
    const deduper = createOrderAlertDeduper({ ttlMs: 5000, now: () => time });
    expect(deduper.claim({ _id: "order-1" })).toBe(true);
    expect(deduper.claim({ data: { orderId: "order-1" } })).toBe(false);
    time += 5001;
    expect(deduper.claim("order-1")).toBe(true);
  });

  it("generates stable positive Android notification IDs", () => {
    const first = notificationIdForKey("64b000000000000000000001");
    expect(first).toBe(notificationIdForKey("64b000000000000000000001"));
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThanOrEqual(0x7fffffff);
  });

  it("does not repeatedly prompt after the first permission decision", () => {
    expect(shouldRequestNotificationPermission("prompt", false)).toBe(true);
    expect(shouldRequestNotificationPermission("prompt-with-rationale", false)).toBe(true);
    expect(shouldRequestNotificationPermission("prompt", true)).toBe(false);
    expect(shouldRequestNotificationPermission("prompt-with-rationale", true)).toBe(false);
    expect(shouldRequestNotificationPermission("denied", false)).toBe(false);
  });
});
