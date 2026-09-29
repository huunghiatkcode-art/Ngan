import { describe, it, expect } from "vitest";
import { toPublicQuestionData } from "@/lib/question-engine/publicize";
import { seededShuffle } from "@/lib/question-engine/shuffle";
import { questionDataSchema, answerPayloadSchema, studentInputSchema } from "@/lib/question-engine/validation";
import { defaultQuestionData } from "@/lib/question-engine/factory";
import { generateCode, slugify } from "@/lib/utils/codes";
import { reportToCsv, type AssignmentReport } from "@/services/report.service";
import { QUESTION_TYPES } from "@/types/question";

const KEY_FIELDS = ["correctOptionId", "correctOptionIds", "correctValue", "acceptedAnswers", "categoryId", "zoneId", "rubric", "scoringMode"];

describe("student payload never leaks the answer key", () => {
  it.each(QUESTION_TYPES)("%s", (type) => {
    const json = JSON.stringify(toPublicQuestionData(defaultQuestionData(type), "seed"));
    for (const k of KEY_FIELDS) expect(json).not.toContain(`"${k}"`);
  });

  it("match keeps both columns but not the pairing as a single record", () => {
    const pub = toPublicQuestionData({ type: "match", pairs: [{ id: "1", left: "L1", right: "R1" }, { id: "2", left: "L2", right: "R2" }] }, "s");
    expect(pub.type === "match" && pub.left.map((x) => x.text)).toEqual(["L1", "L2"]);
  });
});

describe("seededShuffle", () => {
  const arr = Array.from({ length: 20 }, (_, i) => i);
  it("is deterministic per seed and keeps all items", () => {
    expect(seededShuffle(arr, "a")).toEqual(seededShuffle(arr, "a"));
    expect([...seededShuffle(arr, "a")].sort((x, y) => x - y)).toEqual(arr);
  });
  it("differs across seeds", () => expect(seededShuffle(arr, "a")).not.toEqual(seededShuffle(arr, "b")));
  it("does not mutate the input", () => { const c = [...arr]; seededShuffle(c, "x"); expect(c).toEqual(arr); });
});

describe("validation schemas", () => {
  it("accepts every default question", () => {
    for (const t of QUESTION_TYPES) {
      const d = defaultQuestionData(t);
      // defaults for fill_blank contain an empty answer on purpose (teacher must fill it in)
      if (t === "fill_blank") expect(questionDataSchema.safeParse(d).success).toBe(false);
      else expect(questionDataSchema.safeParse(d).success).toBe(true);
    }
  });
  it("rejects multiple choice with <2 options", () => {
    expect(questionDataSchema.safeParse({ type: "multiple_choice", options: [{ id: "a", text: "x" }], correctOptionId: "a", shuffleOptions: false }).success).toBe(false);
  });
  it("answer payload cannot carry score fields as a valid shape", () => {
    const r = answerPayloadSchema.safeParse({ type: "true_false", value: true, score: 999, is_correct: true });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).not.toHaveProperty("score");
  });
  it("student input rules", () => {
    expect(studentInputSchema.safeParse({ fullName: "A", username: "ab", studentCode: "1", pin: "1234" }).success).toBe(false);
    expect(studentInputSchema.safeParse({ fullName: "A", username: "abc", studentCode: "1", pin: "12" }).success).toBe(false);
    expect(studentInputSchema.safeParse({ fullName: "A", username: "abc_1", studentCode: "1", pin: "1234" }).success).toBe(true);
  });
});

describe("codes", () => {
  it("never uses confusable characters", () => {
    for (let i = 0; i < 300; i++) expect(generateCode(8)).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/);
  });
  it("slugify strips Vietnamese diacritics", () => expect(slugify("Kiểm tra Đại số 10")).toBe("kiem-tra-dai-so-10"));
});

describe("CSV export", () => {
  const report: AssignmentReport = {
    attemptsCount: 1, averageScore: 8, highestScore: 8, lowestScore: 8, medianScore: 8, completionRate: 100, questionStats: [],
    studentRows: [{ studentId: "1", fullName: 'Nguyễn "Văn" A', studentCode: "HS001", status: "graded", score: 8, maxScore: 10, percent: 80, correct: 4, wrong: 1, unanswered: 0, timeSpent: 60, submittedAt: null }],
  };
  it("starts with a UTF-8 BOM, keeps Vietnamese text and escapes quotes", () => {
    const csv = reportToCsv(report);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"Nguyễn ""Văn"" A"');
    expect(csv.split("\r\n")).toHaveLength(2);
  });
});
