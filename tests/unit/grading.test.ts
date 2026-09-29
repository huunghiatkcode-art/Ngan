import { describe, it, expect } from "vitest";
import { gradeAnswer } from "@/lib/question-engine/grading";
import type { QuestionData } from "@/types/question";

const opts = [{ id: "a", text: "A" }, { id: "b", text: "B" }, { id: "c", text: "C" }];

describe("gradeAnswer", () => {
  it("multiple choice", () => {
    const d: QuestionData = { type: "multiple_choice", options: opts, correctOptionId: "b", shuffleOptions: false };
    expect(gradeAnswer(d, { type: "multiple_choice", selectedOptionId: "b" }, 10).pointsEarned).toBe(10);
    expect(gradeAnswer(d, { type: "multiple_choice", selectedOptionId: "a" }, 10).pointsEarned).toBe(0);
    expect(gradeAnswer(d, { type: "multiple_choice", selectedOptionId: null }, 10).isCorrect).toBe(false);
  });

  it("multi-select all_or_nothing", () => {
    const d: QuestionData = { type: "multi_select", options: opts, correctOptionIds: ["a", "b"], scoringMode: "all_or_nothing", shuffleOptions: false };
    expect(gradeAnswer(d, { type: "multi_select", selectedOptionIds: ["b", "a"] }, 10).pointsEarned).toBe(10);
    expect(gradeAnswer(d, { type: "multi_select", selectedOptionIds: ["a"] }, 10).pointsEarned).toBe(0);
    expect(gradeAnswer(d, { type: "multi_select", selectedOptionIds: ["a", "b", "c"] }, 10).pointsEarned).toBe(0);
  });

  it("multi-select partial never goes negative", () => {
    const d: QuestionData = { type: "multi_select", options: opts, correctOptionIds: ["a", "b"], scoringMode: "partial", shuffleOptions: false };
    expect(gradeAnswer(d, { type: "multi_select", selectedOptionIds: ["a"] }, 10).pointsEarned).toBe(5);
    expect(gradeAnswer(d, { type: "multi_select", selectedOptionIds: ["c"] }, 10).pointsEarned).toBe(0);
    expect(gradeAnswer(d, { type: "multi_select", selectedOptionIds: ["c", "a"] }, 10).pointsEarned).toBe(0);
  });

  it("true/false", () => {
    const d: QuestionData = { type: "true_false", correctValue: false };
    expect(gradeAnswer(d, { type: "true_false", value: false }, 5).isCorrect).toBe(true);
    expect(gradeAnswer(d, { type: "true_false", value: true }, 5).isCorrect).toBe(false);
    expect(gradeAnswer(d, { type: "true_false", value: null }, 5).isCorrect).toBe(false);
  });

  it("fill blank normalizes whitespace and case", () => {
    const d: QuestionData = { type: "fill_blank", acceptedAnswers: ["Hà Nội", "Ha Noi"], caseSensitive: false };
    expect(gradeAnswer(d, { type: "fill_blank", value: "  hà   nội " }, 4).pointsEarned).toBe(4);
    expect(gradeAnswer(d, { type: "fill_blank", value: "ha noi" }, 4).pointsEarned).toBe(4);
    expect(gradeAnswer(d, { type: "fill_blank", value: "Huế" }, 4).pointsEarned).toBe(0);
    const cs: QuestionData = { ...d, caseSensitive: true } as QuestionData;
    expect(gradeAnswer(cs, { type: "fill_blank", value: "hà nội" }, 4).pointsEarned).toBe(0);
  });

  it("open ended goes to manual review", () => {
    const r = gradeAnswer({ type: "open_ended" }, { type: "open_ended", value: "x" }, 10);
    expect(r.gradingStatus).toBe("manual_review");
    expect(r.isCorrect).toBeNull();
    expect(r.pointsEarned).toBe(0);
  });

  it("reorder is all-or-nothing", () => {
    const d: QuestionData = { type: "reorder", items: [{ id: "1", text: "" }, { id: "2", text: "" }, { id: "3", text: "" }] };
    expect(gradeAnswer(d, { type: "reorder", orderedItemIds: ["1", "2", "3"] }, 9).pointsEarned).toBe(9);
    expect(gradeAnswer(d, { type: "reorder", orderedItemIds: ["2", "1", "3"] }, 9).pointsEarned).toBe(0);
  });

  it("match gives partial credit per pair", () => {
    const d: QuestionData = { type: "match", pairs: [{ id: "p1", left: "a", right: "1" }, { id: "p2", left: "b", right: "2" }] };
    expect(gradeAnswer(d, { type: "match", pairs: { p1: "p1", p2: "p2" } }, 10).pointsEarned).toBe(10);
    const half = gradeAnswer(d, { type: "match", pairs: { p1: "p1", p2: "p1" } }, 10);
    expect(half.pointsEarned).toBe(5);
    expect(half.isCorrect).toBe(false);
  });

  it("categorize and drag_drop score by placement", () => {
    const c: QuestionData = { type: "categorize", categories: [{ id: "x", name: "X" }, { id: "y", name: "Y" }], items: [{ id: "i1", text: "", categoryId: "x" }, { id: "i2", text: "", categoryId: "y" }] };
    expect(gradeAnswer(c, { type: "categorize", categories: { i1: "x", i2: "y" } }, 10).isCorrect).toBe(true);
    expect(gradeAnswer(c, { type: "categorize", categories: { i1: "x", i2: "x" } }, 10).pointsEarned).toBe(5);
    const dd: QuestionData = { type: "drag_drop", zones: [{ id: "z1", label: "" }, { id: "z2", label: "" }], items: [{ id: "i1", label: "", zoneId: "z1" }, { id: "i2", label: "", zoneId: "z2" }] };
    expect(gradeAnswer(dd, { type: "drag_drop", placements: { i1: "z1", i2: "z2" } }, 10).pointsEarned).toBe(10);
    expect(gradeAnswer(dd, { type: "drag_drop", placements: {} }, 10).pointsEarned).toBe(0);
  });

  it("rejects a payload whose type does not match the question", () => {
    const d: QuestionData = { type: "true_false", correctValue: true };
    expect(gradeAnswer(d, { type: "multiple_choice", selectedOptionId: "a" }, 10).pointsEarned).toBe(0);
  });
});
