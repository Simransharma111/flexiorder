import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ORDER_NOTIFICATION_CHANNEL_ID } from "./fcmPush";

describe("Android order notification channel", () => {
  it("uses the same versioned channel in runtime and the Android fallback manifest", () => {
    const manifest = readFileSync(new URL("../../android/app/src/main/AndroidManifest.xml", import.meta.url), "utf8");
    expect(ORDER_NOTIFICATION_CHANNEL_ID).toBe("order_alerts_v4");
    expect(manifest).toContain(`android:value="${ORDER_NOTIFICATION_CHANNEL_ID}"`);
  });
});
