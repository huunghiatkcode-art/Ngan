import { v4 as uuid } from "uuid";
import type { QuestionData, QuestionType } from "@/types/question";

export function defaultQuestionData(type: QuestionType): QuestionData {
  switch (type) {
    case "multiple_choice": {
      const a = { id: uuid(), text: "Đáp án 1" };
      const b = { id: uuid(), text: "Đáp án 2" };
      return { type, options: [a, b], correctOptionId: a.id, shuffleOptions: true };
    }
    case "multi_select": {
      const a = { id: uuid(), text: "Đáp án 1" };
      const b = { id: uuid(), text: "Đáp án 2" };
      const c = { id: uuid(), text: "Đáp án 3" };
      return {
        type,
        options: [a, b, c],
        correctOptionIds: [a.id],
        scoringMode: "all_or_nothing",
        shuffleOptions: true,
      };
    }
    case "true_false":
      return { type, correctValue: true };
    case "fill_blank":
      return { type, acceptedAnswers: [""], caseSensitive: false };
    case "open_ended":
      return { type, instructions: "", characterLimit: 1000 };
    case "reorder":
      return {
        type,
        items: [
          { id: uuid(), text: "Bước 1" },
          { id: uuid(), text: "Bước 2" },
          { id: uuid(), text: "Bước 3" },
        ],
      };
    case "match":
      return {
        type,
        pairs: [
          { id: uuid(), left: "Việt Nam", right: "Hà Nội" },
          { id: uuid(), left: "Nhật Bản", right: "Tokyo" },
        ],
      };
    case "categorize": {
      const c1 = uuid();
      const c2 = uuid();
      return {
        type,
        categories: [
          { id: c1, name: "Nhóm A" },
          { id: c2, name: "Nhóm B" },
        ],
        items: [
          { id: uuid(), text: "Mục 1", categoryId: c1 },
          { id: uuid(), text: "Mục 2", categoryId: c2 },
        ],
      };
    }
    case "drag_drop": {
      const z1 = uuid();
      const z2 = uuid();
      return {
        type,
        zones: [
          { id: z1, label: "Nhóm A" },
          { id: z2, label: "Nhóm B" },
        ],
        items: [
          { id: uuid(), label: "Mục 1", zoneId: z1 },
          { id: uuid(), label: "Mục 2", zoneId: z2 },
        ],
      };
    }
  }
}
