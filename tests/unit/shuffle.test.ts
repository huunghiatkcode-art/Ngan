import { describe, it, expect } from "vitest";
import { seededShuffle } from "@/lib/question-engine/shuffle";

describe("seededShuffle", () => {
  it("is deterministic for the same seed", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    const a = seededShuffle(arr, "attempt-1:question-1");
    const b = seededShuffle(arr, "attempt-1:question-1");
    expect(a).toEqual(b);
  });

  it("produces a different order for a different seed (overwhelmingly likely)", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    const a = seededShuffle(arr, "attempt-1:question-1");
    const b = seededShuffle(arr, "attempt-2:question-1");
    expect(a).not.toEqual(b);
  });

  it("never loses or duplicates elements", () => {
    const arr = ["a", "b", "c", "d", "e"];
    const shuffled = seededShuffle(arr, "seed-x");
    expect([...shuffled].sort()).toEqual([...arr].sort());
  });

  it("does not mutate the input array", () => {
    const arr = [1, 2, 3];
    const copy = [...arr];
    seededShuffle(arr, "seed");
    expect(arr).toEqual(copy);
  });
});
