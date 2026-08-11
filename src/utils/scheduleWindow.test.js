import { describe, expect, it } from "vitest";
import {
  getSchedulePickerBounds,
  validateScheduledOrderTime,
} from "./scheduleWindow";

describe("scheduled-order picker bounds", () => {
  it("rounds the one-hour minimum up and the 48-hour maximum down", () => {
    const bounds = getSchedulePickerBounds(new Date(2026, 7, 11, 10, 15, 30, 250));

    expect(bounds).toEqual({
      min: "2026-08-11T11:16",
      max: "2026-08-13T10:15",
    });
  });

  it("keeps exact-minute boundaries and crosses midnight safely", () => {
    const bounds = getSchedulePickerBounds(new Date(2026, 7, 11, 23, 30, 0, 0));

    expect(bounds).toEqual({
      min: "2026-08-12T00:30",
      max: "2026-08-13T23:30",
    });
  });
});

describe("scheduled-order validation", () => {
  const now = new Date(2026, 7, 11, 10, 0, 0, 0);

  it("accepts the exact one-hour and 48-hour boundaries", () => {
    expect(validateScheduledOrderTime("2026-08-11T11:00", now)).toEqual({ valid: true, error: "" });
    expect(validateScheduledOrderTime("2026-08-13T10:00", now)).toEqual({ valid: true, error: "" });
  });

  it("rejects missing and malformed local date-times", () => {
    expect(validateScheduledOrderTime("", now).error).toBe("Please select a schedule time.");
    expect(validateScheduledOrderTime("2026-02-30T10:00", now).error)
      .toBe("Please select a valid date and time.");
    expect(validateScheduledOrderTime("not-a-date", now).error)
      .toBe("Please select a valid date and time.");
  });

  it("rejects past, stale, and less-than-one-hour selections", () => {
    expect(validateScheduledOrderTime("2026-08-11T09:59", now).error)
      .toMatch(/at least 1 hour/);
    expect(validateScheduledOrderTime("2026-08-11T10:59", now).error)
      .toMatch(/at least 1 hour/);
    expect(validateScheduledOrderTime("2026-08-11T11:00", new Date(2026, 7, 11, 10, 1)).error)
      .toMatch(/at least 1 hour/);
  });

  it("rejects selections beyond 48 hours", () => {
    expect(validateScheduledOrderTime("2026-08-13T10:01", now).error)
      .toMatch(/up to 2 days/);
  });
});
