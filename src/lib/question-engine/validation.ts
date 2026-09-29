import { z } from "zod";
import type { QuestionType } from "@/types/question";

const optionSchema = z.object({ id: z.string().min(1), text: z.string() });

export const questionDataSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("multiple_choice"),
    options: z.array(optionSchema).min(2).max(10),
    correctOptionId: z.string().min(1),
    shuffleOptions: z.boolean(),
  }),
  z.object({
    type: z.literal("multi_select"),
    options: z.array(optionSchema).min(2).max(10),
    correctOptionIds: z.array(z.string().min(1)).min(1),
    scoringMode: z.enum(["all_or_nothing", "partial"]),
    shuffleOptions: z.boolean(),
  }),
  z.object({ type: z.literal("true_false"), correctValue: z.boolean() }),
  z.object({
    type: z.literal("fill_blank"),
    acceptedAnswers: z.array(z.string().min(1)).min(1),
    caseSensitive: z.boolean(),
  }),
  z.object({
    type: z.literal("open_ended"),
    instructions: z.string().optional(),
    characterLimit: z.number().int().positive().optional(),
    rubric: z.string().optional(),
  }),
  z.object({
    type: z.literal("reorder"),
    items: z.array(z.object({ id: z.string().min(1), text: z.string() })).min(2),
  }),
  z.object({
    type: z.literal("match"),
    pairs: z
      .array(z.object({ id: z.string().min(1), left: z.string().min(1), right: z.string().min(1) }))
      .min(1),
  }),
  z.object({
    type: z.literal("categorize"),
    categories: z.array(z.object({ id: z.string().min(1), name: z.string().min(1) })).min(2),
    items: z
      .array(z.object({ id: z.string().min(1), text: z.string().min(1), categoryId: z.string().min(1) }))
      .min(1),
  }),
  z.object({
    type: z.literal("drag_drop"),
    zones: z.array(z.object({ id: z.string().min(1), label: z.string().min(1) })).min(2),
    items: z
      .array(z.object({ id: z.string().min(1), label: z.string().min(1), zoneId: z.string().min(1) }))
      .min(1),
  }),
]);

export const answerPayloadSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("multiple_choice"), selectedOptionId: z.string().nullable() }),
  z.object({ type: z.literal("multi_select"), selectedOptionIds: z.array(z.string()) }),
  z.object({ type: z.literal("true_false"), value: z.boolean().nullable() }),
  z.object({ type: z.literal("fill_blank"), value: z.string().max(2000) }),
  z.object({ type: z.literal("open_ended"), value: z.string().max(5000) }),
  z.object({ type: z.literal("reorder"), orderedItemIds: z.array(z.string()) }),
  z.object({ type: z.literal("match"), pairs: z.record(z.string(), z.string()) }),
  z.object({ type: z.literal("categorize"), categories: z.record(z.string(), z.string()) }),
  z.object({ type: z.literal("drag_drop"), placements: z.record(z.string(), z.string()) }),
]);

export const quizQuestionInputSchema = z.object({
  type: z.custom<QuestionType>(),
  title: z.string().max(300).optional().nullable(),
  content: z.string().max(10000),
  data: questionDataSchema,
  points: z.number().int().min(0).max(10000),
  timeLimit: z.number().int().positive().max(3600).nullable().optional(),
  explanation: z.string().max(5000).optional().nullable(),
});

export const quizInputSchema = z.object({
  title: z.string().min(1, "Tiêu đề không được để trống").max(200),
  description: z.string().max(2000).optional(),
});

export const classInputSchema = z.object({
  name: z.string().min(1, "Tên lớp không được để trống").max(200),
  description: z.string().max(2000).optional(),
});

export const studentInputSchema = z.object({
  fullName: z.string().min(1, "Họ tên không được để trống").max(200),
  username: z
    .string()
    .min(3, "Tên đăng nhập tối thiểu 3 ký tự")
    .max(50)
    .regex(/^[a-z0-9_.]+$/, "Chỉ dùng chữ thường, số, dấu chấm và gạch dưới"),
  studentCode: z.string().min(1).max(50),
  pin: z.string().regex(/^\d{4,8}$/, "PIN phải gồm 4-8 chữ số"),
});

export const assignmentInputSchema = z.object({
  title: z.string().min(1).max(200),
  quizId: z.string().uuid(),
  classId: z.string().uuid().nullable().optional(),
  startAt: z.string().datetime().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  password: z.string().min(4).max(50).optional(),
  timeLimitSeconds: z.number().int().positive().max(24 * 3600).nullable().optional(),
  attemptsAllowed: z.number().int().min(1).max(10),
  randomizeQuestions: z.boolean(),
  randomizeAnswers: z.boolean(),
  allowBackNavigation: z.boolean(),
  showResult: z.boolean(),
  showCorrectAnswer: z.boolean(),
  showLeaderboard: z.boolean(),
});

export const studentLoginSchema = z.object({
  username: z.string().min(1),
  pin: z.string().min(1),
});

export const joinAssignmentSchema = z.object({
  joinCode: z.string().min(4).max(12),
  password: z.string().optional(),
});
