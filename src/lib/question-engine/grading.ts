import type { AnswerPayload } from "@/types/question";
import type { QuestionData } from "@/types/question";
import type { GradingStatus } from "@/types/database";

export interface GradeResult {
  isCorrect: boolean | null;
  pointsEarned: number;
  gradingStatus: GradingStatus;
}

function normalizeText(v: string, caseSensitive: boolean) {
  const trimmed = v.trim().replace(/\s+/g, " ");
  return caseSensitive ? trimmed : trimmed.toLowerCase();
}

/**
 * Grades a single answer against its question's answer key. This is the
 * ONLY place scoring happens — always called server-side with data loaded
 * fresh from the database, never trusting a score/is_correct sent by the
 * client (the client never sends those fields at all, see AnswerPayload).
 */
export function gradeAnswer(data: QuestionData, answer: AnswerPayload, points: number): GradeResult {
  if (data.type !== answer.type) {
    // Type mismatch between question and submitted payload — never trust it.
    return { isCorrect: false, pointsEarned: 0, gradingStatus: "auto" };
  }

  switch (data.type) {
    case "multiple_choice": {
      const a = answer as Extract<AnswerPayload, { type: "multiple_choice" }>;
      const correct = a.selectedOptionId !== null && a.selectedOptionId === data.correctOptionId;
      return { isCorrect: correct, pointsEarned: correct ? points : 0, gradingStatus: "auto" };
    }

    case "multi_select": {
      const a = answer as Extract<AnswerPayload, { type: "multi_select" }>;
      const correctSet = new Set(data.correctOptionIds);
      const selectedSet = new Set(a.selectedOptionIds);
      const isExact =
        correctSet.size === selectedSet.size && [...correctSet].every((id) => selectedSet.has(id));

      if (data.scoringMode === "all_or_nothing") {
        return { isCorrect: isExact, pointsEarned: isExact ? points : 0, gradingStatus: "auto" };
      }
      // partial credit: (correctly selected - incorrectly selected) / total correct, floored at 0
      let correctlySelected = 0;
      let incorrectlySelected = 0;
      selectedSet.forEach((id) => (correctSet.has(id) ? correctlySelected++ : incorrectlySelected++));
      const fraction = Math.max(0, (correctlySelected - incorrectlySelected) / (correctSet.size || 1));
      const pointsEarned = Math.round(points * fraction);
      return { isCorrect: isExact, pointsEarned, gradingStatus: "auto" };
    }

    case "true_false": {
      const a = answer as Extract<AnswerPayload, { type: "true_false" }>;
      const correct = a.value !== null && a.value === data.correctValue;
      return { isCorrect: correct, pointsEarned: correct ? points : 0, gradingStatus: "auto" };
    }

    case "fill_blank": {
      const a = answer as Extract<AnswerPayload, { type: "fill_blank" }>;
      const submitted = normalizeText(a.value ?? "", data.caseSensitive);
      const correct = data.acceptedAnswers.some(
        (accepted) => normalizeText(accepted, data.caseSensitive) === submitted
      );
      return { isCorrect: correct, pointsEarned: correct ? points : 0, gradingStatus: "auto" };
    }

    case "open_ended": {
      // Never auto-graded — always routed to the teacher for manual review.
      return { isCorrect: null, pointsEarned: 0, gradingStatus: "manual_review" };
    }

    case "reorder": {
      const a = answer as Extract<AnswerPayload, { type: "reorder" }>;
      const correctOrder = data.items.map((it) => it.id);
      const correct =
        correctOrder.length === a.orderedItemIds.length &&
        correctOrder.every((id, i) => id === a.orderedItemIds[i]);
      return { isCorrect: correct, pointsEarned: correct ? points : 0, gradingStatus: "auto" };
    }

    case "match": {
      const a = answer as Extract<AnswerPayload, { type: "match" }>;
      const total = data.pairs.length;
      let correctCount = 0;
      for (const pair of data.pairs) {
        if (a.pairs[pair.id] === pair.id) correctCount++;
      }
      const isCorrect = correctCount === total;
      const pointsEarned = Math.round(points * (correctCount / (total || 1)));
      return { isCorrect, pointsEarned, gradingStatus: "auto" };
    }

    case "categorize": {
      const a = answer as Extract<AnswerPayload, { type: "categorize" }>;
      const total = data.items.length;
      let correctCount = 0;
      for (const item of data.items) {
        if (a.categories[item.id] === item.categoryId) correctCount++;
      }
      const isCorrect = correctCount === total;
      const pointsEarned = Math.round(points * (correctCount / (total || 1)));
      return { isCorrect, pointsEarned, gradingStatus: "auto" };
    }

    case "drag_drop": {
      const a = answer as Extract<AnswerPayload, { type: "drag_drop" }>;
      const total = data.items.length;
      let correctCount = 0;
      for (const item of data.items) {
        if (a.placements[item.id] === item.zoneId) correctCount++;
      }
      const isCorrect = correctCount === total;
      const pointsEarned = Math.round(points * (correctCount / (total || 1)));
      return { isCorrect, pointsEarned, gradingStatus: "auto" };
    }
  }
}
