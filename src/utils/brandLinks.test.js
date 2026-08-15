import { describe, it, expect } from "vitest";
import { toBrandLinkUrl, toInstagramUrl } from "./brandLinks";

describe("toBrandLinkUrl", () => {
  it("passes through full URLs", () => {
    expect(toBrandLinkUrl("https://hotel.com")).toBe("https://hotel.com");
    expect(toBrandLinkUrl("http://hotel.com")).toBe("http://hotel.com");
  });
  it("prefixes bare domains with https", () => {
    expect(toBrandLinkUrl("hotel.com")).toBe("https://hotel.com");
  });
  it("rejects empty or spaced values", () => {
    expect(toBrandLinkUrl("")).toBeNull();
    expect(toBrandLinkUrl("hotel .com")).toBeNull();
  });
});

describe("toInstagramUrl", () => {
  it("builds profile URLs from handles", () => {
    expect(toInstagramUrl("@myhotel")).toBe("https://instagram.com/myhotel");
    expect(toInstagramUrl("myhotel")).toBe("https://instagram.com/myhotel");
  });
  it("passes through or fixes instagram.com URLs", () => {
    expect(toInstagramUrl("https://instagram.com/myhotel")).toBe("https://instagram.com/myhotel");
    expect(toInstagramUrl("instagram.com/myhotel")).toBe("https://instagram.com/myhotel");
  });
  it("rejects empty values", () => {
    expect(toInstagramUrl("")).toBeNull();
    expect(toInstagramUrl(null)).toBeNull();
  });
});
