// Question Engine data model.
//
// IMPORTANT SECURITY BOUNDARY: `QuestionData` (below) is the full,
// teacher-side representation and includes the answer key. Never send it
// to the student's browser. `toPublicQuestionData()` in
// lib/question-engine/publicize.ts strips every answer-key field and
// produces `PublicQuestionData`, which is the only shape allowed to reach
// a student-facing page/component.
//
// This MVP ships 9 of the 14 question types end-to-end (editor + student
// renderer + grading). The remaining 5 (passage, table, dropdown, hot_text,
// match_table) are documented extension points — see docs/question-engine.md
// for the exact steps to add one, following the same pattern as the 9 below.

export type QuestionType =
  | "multiple_choice"
  | "multi_select"
  | "true_false"
  | "fill_blank"
  | "open_ended"
  | "reorder"
  | "match"
  | "categorize"
  | "drag_drop";

export interface QuestionOption {
  id: string;
  text: string;
}

// ---- Teacher-side (full) data per type — includes the answer key ----

export interface MultipleChoiceData {
  type: "multiple_choice";
  options: QuestionOption[];
  correctOptionId: string;
  shuffleOptions: boolean;
}

export type MultiSelectScoringMode = "all_or_nothing" | "partial";
export interface MultiSelectData {
  type: "multi_select";
  options: QuestionOption[];
  correctOptionIds: string[];
  scoringMode: MultiSelectScoringMode;
  shuffleOptions: boolean;
}

export interface TrueFalseData {
  type: "true_false";
  correctValue: boolean;
}

export interface FillBlankData {
  type: "fill_blank";
  acceptedAnswers: string[];
  caseSensitive: boolean;
}

export interface OpenEndedData {
  type: "open_ended";
  instructions?: string;
  characterLimit?: number;
  rubric?: string;
}

export interface ReorderItem {
  id: string;
  text: string;
}
export interface ReorderData {
  type: "reorder";
  items: ReorderItem[]; // stored in the CORRECT order
}

export interface MatchPair {
  id: string;
  left: string;
  right: string;
}
export interface MatchData {
  type: "match";
  pairs: MatchPair[];
}

export interface CategorizeCategory {
  id: string;
  name: string;
}
export interface CategorizeItem {
  id: string;
  text: string;
  categoryId: string; // correct category
}
export interface CategorizeData {
  type: "categorize";
  categories: CategorizeCategory[];
  items: CategorizeItem[];
}

export interface DragDropZone {
  id: string;
  label: string;
}
export interface DragDropItem {
  id: string;
  label: string;
  zoneId: string; // correct zone
}
export interface DragDropData {
  type: "drag_drop";
  zones: DragDropZone[];
  items: DragDropItem[];
}

export type QuestionData =
  | MultipleChoiceData
  | MultiSelectData
  | TrueFalseData
  | FillBlankData
  | OpenEndedData
  | ReorderData
  | MatchData
  | CategorizeData
  | DragDropData;

// ---- Student-facing (public) data per type — NO answer key ----

export type PublicQuestionData =
  | { type: "multiple_choice"; options: QuestionOption[] }
  | { type: "multi_select"; options: QuestionOption[] }
  | { type: "true_false" }
  | { type: "fill_blank" }
  | { type: "open_ended"; instructions?: string; characterLimit?: number }
  | { type: "reorder"; items: ReorderItem[] } // shuffled order, ids kept
  | { type: "match"; left: { id: string; text: string }[]; right: { id: string; text: string }[] }
  | { type: "categorize"; categories: CategorizeCategory[]; items: { id: string; text: string }[] }
  | { type: "drag_drop"; zones: DragDropZone[]; items: { id: string; label: string }[] };

// ---- Student answer payloads (what the client is allowed to submit) ----

export type AnswerPayload =
  | { type: "multiple_choice"; selectedOptionId: string | null }
  | { type: "multi_select"; selectedOptionIds: string[] }
  | { type: "true_false"; value: boolean | null }
  | { type: "fill_blank"; value: string }
  | { type: "open_ended"; value: string }
  | { type: "reorder"; orderedItemIds: string[] }
  | { type: "match"; pairs: Record<string, string> } // leftId -> rightId
  | { type: "categorize"; categories: Record<string, string> } // itemId -> categoryId
  | { type: "drag_drop"; placements: Record<string, string> }; // itemId -> zoneId

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "Trắc nghiệm",
  multi_select: "Chọn nhiều",
  true_false: "Đúng / Sai",
  fill_blank: "Điền vào chỗ trống",
  open_ended: "Câu hỏi mở",
  reorder: "Sắp xếp",
  match: "Ghép đôi",
  categorize: "Phân loại",
  drag_drop: "Kéo thả",
};

export const QUESTION_TYPES: QuestionType[] = Object.keys(
  QUESTION_TYPE_LABELS
) as QuestionType[];

export interface QuizQuestion {
  id: string;
  quizId: string;
  type: QuestionType;
  orderIndex: number;
  title: string | null;
  content: string;
  data: QuestionData;
  points: number;
  timeLimit: number | null;
  explanation: string | null;
  settings: Record<string, unknown>;
}

export interface PublicQuizQuestion {
  id: string;
  type: QuestionType;
  orderIndex: number;
  title: string | null;
  content: string;
  data: PublicQuestionData;
  points: number;
  timeLimit: number | null;
}
