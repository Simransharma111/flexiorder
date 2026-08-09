import { describe, expect, it } from "vitest";
import { sortDishesForDisplay } from "./menuOrdering";

describe("menu display ordering", () => {
  it("puts numbered dishes first and preserves normal dish order", () => {
    const result = sortDishesForDisplay([
      { _id: "normal-1", displayOrder: 0 },
      { _id: "third", displayOrder: 3 },
      { _id: "first", displayOrder: 1 },
      { _id: "normal-2" },
    ]);
    expect(result.map((dish) => dish._id)).toEqual([
      "first",
      "third",
      "normal-1",
      "normal-2",
    ]);
  });
});
