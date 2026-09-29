import { describe, it, expect } from "vitest";
import {
  questionDataSchema,
  answerPayloadSchema,
  studentInputSchema,
  joinAssignmentSchema,
} from "@/lib/question-engine/validation";

describe("questionDataSchema", () => {
  it("accepts a valid multiple_choice payload", () => {
    const result = questionDataSchema.safeParse({
      type: "multiple_choice",
      options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
      correctOptionId: "a",
      shuffleOptions: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects multiple_choice with fewer than 2 options", () => {
    const result = questionDataSchema.safeParse({
      type: "multiple_choice",
      options: [{ id: "a", text: "A" }],
      correctOptionId: "a",
      shuffleOptions: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown question type (discriminated union)", () => {
    const result = questionDataSchema.safeParse({ type: "not_a_real_type" });
    expect(result.success).toBe(false);
  });
});

describe("answerPayloadSchema — never accepts score/is_correct fields from the client", () => {
  it("parses a clean multiple_choice answer", () => {
    const result = answerPayloadSchema.safeParse({ type: "multiple_choice", selectedOptionId: "a" });
    expect(result.success).toBe(true);
  });

  it("strips unknown fields like isCorrect/pointsEarned rather than trusting them", () => {
    const result = answerPayloadSchema.safeParse({
      type: "true_false",
      value: true,
      isCorrect: true, // a malicious/buggy client trying to self-grade
      pointsEarned: 999,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("isCorrect");
      expect(result.data).not.toHaveProperty("pointsEarned");
    }
  });
});

describe("studentInputSchema", () => {
  it("requires a numeric 4-8 digit PIN", () => {
    expect(
      studentInputSchema.safeParse({ fullName: "A", username: "hs01", studentCode: "HS01", pin: "123" }).success
    ).toBe(false);
    expect(
      studentInputSchema.safeParse({ fullName: "A", username: "hs01", studentCode: "HS01", pin: "1234" }).success
    ).toBe(true);
  });

  it("rejects usernames with uppercase or special characters", () => {
    expect(
      studentInputSchema.safeParse({ fullName: "A", username: "HS 01!", studentCode: "HS01", pin: "1234" }).success
    ).toBe(false);
  });
});

describe("joinAssignmentSchema", () => {
  it("requires a join code between 4 and 12 characters", () => {
    expect(joinAssignmentSchema.safeParse({ joinCode: "AB" }).success).toBe(false);
    expect(joinAssignmentSchema.safeParse({ joinCode: "ABCD12" }).success).toBe(true);
  });
});
