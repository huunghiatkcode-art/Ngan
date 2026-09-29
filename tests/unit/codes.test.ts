import { describe, it, expect } from "vitest";
import { generateCode, slugify } from "@/lib/utils/codes";

describe("generateCode", () => {
  it("generates a code of the requested length", () => {
    expect(generateCode(6)).toHaveLength(6);
    expect(generateCode(8)).toHaveLength(8);
  });

  it("never contains visually-confusable characters (0/O, 1/I/L)", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateCode(10);
      expect(code).not.toMatch(/[01OIL]/);
    }
  });
});

describe("slugify", () => {
  it("strips Vietnamese diacritics and lowercases", () => {
    expect(slugify("Kiến Thức Tổng Hợp")).toBe("kien-thuc-tong-hop");
  });

  it("converts đ/Đ to d", () => {
    expect(slugify("Đề thi Toán")).toBe("de-thi-toan");
  });

  it("collapses non-alphanumeric runs into single hyphens with no leading/trailing hyphen", () => {
    expect(slugify("  Hello!!  World??  ")).toBe("hello-world");
  });
});
