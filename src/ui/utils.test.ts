import { describe, expect, it } from "vitest";

import { clamp, classList, getWordCount, partition } from "./utils";

describe("classList", () => {
  it("keeps only keys with truthy values", () => {
    expect(classList({ a: true, b: false, c: true })).toEqual(["a", "c"]);
  });

  it("returns an empty list when nothing is enabled", () => {
    expect(classList({ a: false })).toEqual([]);
  });
});

describe("clamp", () => {
  it.each([
    [-5, 1],
    [3, 3],
    [99, 5],
  ])("clamp(%i, 1, 5) === %i", (num, expected) => {
    expect(clamp(num, 1, 5)).toBe(expected);
  });
});

describe("partition", () => {
  it("splits elements by predicate, preserving order", () => {
    expect(partition(["a1", "b", "c2", "d"], (s) => /\d/.test(s))).toEqual([
      ["a1", "c2"],
      ["b", "d"],
    ]);
  });
});

describe("getWordCount", () => {
  it("counts space-delimited words", () => {
    expect(getWordCount("the quick brown fox")).toBe(4);
  });

  it("ignores punctuation and extra whitespace", () => {
    expect(getWordCount("  Hello,   world!  \n\n ")).toBe(2);
  });

  it("treats hyphenated words and formatted numbers as single words", () => {
    expect(getWordCount("well-known 1,000,000 3.14")).toBe(3);
  });

  it("counts accented Latin words", () => {
    expect(getWordCount("café naïve résumé")).toBe(3);
  });

  it("counts each CJK character as a word", () => {
    expect(getWordCount("日本語")).toBe(3);
  });

  it("counts mixed Latin and CJK text", () => {
    expect(getWordCount("hello 世界")).toBe(3);
  });

  it("returns 0 for empty text", () => {
    expect(getWordCount("")).toBe(0);
  });
});
