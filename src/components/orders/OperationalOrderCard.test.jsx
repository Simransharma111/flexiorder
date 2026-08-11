import { describe, expect, it } from "vitest";
import { operationalOrderTotal } from "./OperationalOrderCard";

describe("operational order amount", () => {
  it("prefers the stored final order total", () => {
    expect(operationalOrderTotal({
      totalAmount: 283.5,
      items: [{ price: 300, finalPrice: 270, quantity: 1 }],
    })).toBe(283.5);
  });

  it("falls back to final item prices and preserves legitimate zero values", () => {
    expect(operationalOrderTotal({
      items: [
        { price: 300, finalPrice: 250, quantity: 2 },
        { price: 100, finalPrice: 0, quantity: 1 },
      ],
    })).toBe(500);
  });

  it("ignores malformed totals and coercible whitespace before using valid prices", () => {
    expect(operationalOrderTotal({
      totalAmount: "   ",
      total: "125.50",
      items: [{ price: 999, quantity: 1 }],
    })).toBe(125.5);
    expect(operationalOrderTotal({
      totalAmount: "invalid",
      items: [{ finalPrice: " ", price: 40, quantity: 2 }],
    })).toBe(80);
  });
});
