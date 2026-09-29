import { describe, expect, it } from "vitest";

import { classList, partition } from "./utils";

describe("classList", () => {
  it("keeps only keys with truthy values", () => {
    expect(classList({ a: true, b: false, c: true })).toEqual(["a", "c"]);
  });

  it("returns an empty list when nothing is enabled", () => {
    expect(classList({ a: false })).toEqual([]);
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
