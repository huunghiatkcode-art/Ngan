import type { PublicQuestionData, QuestionData, QuizQuestion } from "@/types/question";
import { seededShuffle } from "./shuffle";

/**
 * Strips the answer key out of a question's data. This is the ONLY function
 * allowed to produce data that reaches a student-facing page — never pass
 * a raw `QuestionData` / `QuizQuestion` to student code.
 *
 * `seed` should be stable per (attempt, question) — e.g. `${attemptId}:${questionId}`
 * — so shuffled option/item order stays put across reloads.
 */
export function toPublicQuestionData(data: QuestionData, seed: string): PublicQuestionData {
  switch (data.type) {
    case "multiple_choice":
      return {
        type: data.type,
        options: data.shuffleOptions ? seededShuffle(data.options, seed) : data.options,
      };
    case "multi_select":
      return {
        type: data.type,
        options: data.shuffleOptions ? seededShuffle(data.options, seed) : data.options,
      };
    case "true_false":
      return { type: data.type };
    case "fill_blank":
      return { type: data.type };
    case "open_ended":
      return { type: data.type, instructions: data.instructions, characterLimit: data.characterLimit };
    case "reorder":
      return { type: data.type, items: seededShuffle(data.items, seed) };
    case "match": {
      const left = data.pairs.map((p) => ({ id: p.id, text: p.left }));
      const right = seededShuffle(
        data.pairs.map((p) => ({ id: p.id, text: p.right })),
        seed
      );
      return { type: data.type, left, right };
    }
    case "categorize":
      return {
        type: data.type,
        categories: data.categories,
        items: seededShuffle(
          data.items.map((it) => ({ id: it.id, text: it.text })),
          seed
        ),
      };
    case "drag_drop":
      return {
        type: data.type,
        zones: data.zones,
        items: seededShuffle(
          data.items.map((it) => ({ id: it.id, label: it.label })),
          seed
        ),
      };
  }
}

export function toPublicQuestion(
  q: QuizQuestion,
  attemptId: string
): { id: string; type: QuizQuestion["type"]; orderIndex: number; title: string | null; content: string; data: PublicQuestionData; points: number; timeLimit: number | null } {
  return {
    id: q.id,
    type: q.type,
    orderIndex: q.orderIndex,
    title: q.title,
    content: q.content,
    data: toPublicQuestionData(q.data, `${attemptId}:${q.id}`),
    points: q.points,
    timeLimit: q.timeLimit,
  };
}
