import { describe, expect, it } from "vitest";
import { getDishPricing } from "./pricing";

describe("dish pricing", () => {
  it("calculates percentage and fixed discounts", () => {
    expect(getDishPricing({ price: 200, discountType: "percentage", discountValue: 10 }).finalPrice).toBe(180);
    expect(getDishPricing({ price: 200, discountType: "fixed", discountValue: 25 }).finalPrice).toBe(175);
  });

  it("keeps malformed values finite and ignores unknown discount types", () => {
    expect(getDishPricing({ price: "invalid", discountValue: Infinity }).finalPrice).toBe(0);
    expect(getDishPricing({ price: 200, discountType: "mystery", discountValue: 50 }).finalPrice).toBe(200);
  });

  it("supports legacy percentage discounts without an explicit type", () => {
    expect(getDishPricing({ price: 100, discount: 20 }).finalPrice).toBe(80);
  });
});
