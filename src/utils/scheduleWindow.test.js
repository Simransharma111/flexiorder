import { describe, expect, it } from "vitest";
import {
  getSchedulePickerBounds,
  validateScheduledOrderTime,
} from "./scheduleWindow";

describe("scheduled-order picker bounds", () => {
  it("starts the picker at the first minute after the current time", () => {
    const bounds = getSchedulePickerBounds(new Date(2026, 7, 11, 10, 15, 30, 250));

    expect(bounds).toEqual({
      min: "2026-08-11T10:16",
      max: "2026-08-13T10:15",
    });
  });

  it("never offers the current minute, including on exact-minute clock readings", () => {
    expect(getSchedulePickerBounds(new Date(2026, 7, 11, 10, 15, 0, 0)).min)
      .toBe("2026-08-11T10:16");
    expect(getSchedulePickerBounds(new Date(2026, 7, 11, 23, 59, 0, 0)).min)
      .toBe("2026-08-12T00:00");
  });

  it("keeps the 48-hour maximum on minute precision and crosses midnight safely", () => {
    const bounds = getSchedulePickerBounds(new Date(2026, 7, 11, 23, 30, 0, 0));
    expect(bounds.max).toBe("2026-08-13T23:30");
  });
});

describe("scheduled-order validation", () => {
  const now = new Date(2026, 7, 11, 10, 0, 0, 0);

  it("accepts future times, including the next minute", () => {
    expect(validateScheduledOrderTime("2026-08-11T10:01", now)).toEqual({ valid: true, error: "" });
    expect(validateScheduledOrderTime("2026-08-11T11:00", now)).toEqual({ valid: true, error: "" });
    expect(validateScheduledOrderTime("2026-08-13T10:00", now)).toEqual({ valid: true, error: "" });
  });

  it("rejects the exact current time", () => {
    const result = validateScheduledOrderTime("2026-08-11T10:00", now);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Please choose a future time for your scheduled order.");
  });

  it("rejects past times", () => {
    expect(validateScheduledOrderTime("2026-08-11T09:59", now).valid).toBe(false);
    expect(validateScheduledOrderTime("2026-08-10T10:00", now).valid).toBe(false);
    expect(validateScheduledOrderTime("2026-08-11T00:01", now).valid).toBe(false);
  });

  it("rejects the current time around non-exact-minute clocks", () => {
    const t = new Date(2026, 7, 11, 10, 0, 45, 500);
    expect(validateScheduledOrderTime("2026-08-11T10:00", t).valid).toBe(false);
    expect(validateScheduledOrderTime("2026-08-11T10:01", t).valid).toBe(true);
  });

  it("rejects missing and malformed local date-times", () => {
    expect(validateScheduledOrderTime("", now).error).toBe("Please select a schedule time.");
    expect(validateScheduledOrderTime("2026-02-30T10:00", now).error)
      .toBe("Please select a valid date and time.");
    expect(validateScheduledOrderTime("not-a-date", now).error)
      .toBe("Please select a valid date and time.");
  });

  it("rejects selections beyond 48 hours", () => {
    expect(validateScheduledOrderTime("2026-08-13T10:01", now).error)
      .toMatch(/up to 2 days/);
  });
});
