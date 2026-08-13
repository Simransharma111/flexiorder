import { describe, expect, it } from "vitest";
import { getSpecialLabels } from "./FeaturedSection";

describe("special picks", () => {
  it("keeps one dish while exposing all of its promotion labels", () => {
    expect(getSpecialLabels({
      featured: true,
      todaySpecial: true,
      isRecommended: true,
      isBestseller: false,
      isPopular: true,
      isNewArrival: false,
      chefChoice: true,
    })).toEqual([
      "Featured",
      "Today’s special",
      "Recommended",
      "Most popular",
      "Chef’s choice",
    ]);
  });
});
