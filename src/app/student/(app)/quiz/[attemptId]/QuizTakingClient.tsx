"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Flag } from "lucide-react";
import type { AnswerPayload, PublicQuizQuestion } from "@/types/question";
import type { Attempt, AssignmentSettings } from "@/types/database";
import QuestionPlayer, { emptyAnswerFor } from "@/components/quiz/QuestionPlayer";
import Timer from "@/components/quiz/Timer";
import ConnectionStatus, { type ConnState } from "@/components/quiz/ConnectionStatus";
import Button from "@/components/ui/Button";
import ConfirmButton from "@/components/ui/ConfirmButton";
import { saveAnswerAction, heartbeatAction, submitAttemptAction } from "../actions";

interface AttemptView {
  attempt: Attempt;
  settings: AssignmentSettings;
  questions: PublicQuizQuestion[];
  answers: { questionId: string; answer: Record<string, unknown>; isAnswered: boolean }[];
}

const CACHE_PREFIX = "qp_answers_";

export default function QuizTakingClient({ attemptId, initial }: { attemptId: string; initial: AttemptView }) {
  const router = useRouter();
  const { settings, questions, attempt } = initial;

  const [index, setIndex] = useState(() => Math.min(attempt.current_question_index, questions.length - 1) || 0);
  const [answers, setAnswers] = useState<Record<string, AnswerPayload>>(() => {
    const base: Record<string, AnswerPayload> = {};
    for (const q of questions) {
      const existing = initial.answers.find((a) => a.questionId === q.id);
      base[q.id] = existing?.isAnswered ? (existing.answer as unknown as AnswerPayload) : emptyAnswerFor(q);
    }
    // Merge in any not-yet-synced local cache (survives reload while offline).
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + attemptId);
      if (raw) {
        const cached = JSON.parse(raw) as { pending: Record<string, AnswerPayload> };
        Object.assign(base, cached.pending);
      }
    } catch {
      /* ignore corrupt cache */
    }
    return base;
  });
  const [pending, setPending] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + attemptId);
      if (raw) return new Set(Object.keys((JSON.parse(raw) as { pending: Record<string, AnswerPayload> }).pending));
    } catch {
      /* ignore */
    }
    return new Set();
  });
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [submitting, setSubmitting] = useState(false);

  const current = questions[index];

  const persistCache = useCallback(
    (pendingMap: Record<string, AnswerPayload>) => {
      try {
        localStorage.setItem(CACHE_PREFIX + attemptId, JSON.stringify({ pending: pendingMap }));
      } catch {
        /* storage full/unavailable — in-memory state still works for this tab */
      }
    },
    [attemptId]
  );

  const flushOne = useCallback(
    async (questionId: string, payload: AnswerPayload, questionIndex: number) => {
      try {
        await saveAnswerAction(attemptId, questionId, payload, questionIndex);
        setPending((prev) => {
          const next = new Set(prev);
          next.delete(questionId);
          const pendingMap: Record<string, AnswerPayload> = {};
          next.forEach((id) => (pendingMap[id] = answersRef.current[id]));
          persistCache(pendingMap);
          return next;
        });
      } catch {
        // stays pending — will retry on next flush cycle / reconnect
      }
    },
    [attemptId, persistCache]
  );

  // keep a ref to always read latest answers inside timers/callbacks
  const answersRef = useRef(answers);
  useEffect(() => {
    // Standard "latest value in a ref" pattern for reading fresh state inside
    // timers/async callbacks — safe despite the experimental react-compiler
    // lint rule below being overly strict about ref mutation in effects.
    // eslint-disable-next-line react-hooks/immutability
    answersRef.current = answers;
  }, [answers]);

  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const handleAnswerChange = (payload: AnswerPayload) => {
    setAnswers((prev) => ({ ...prev, [current.id]: payload }));
    setPending((prev) => {
      const next = new Set(prev).add(current.id);
      const pendingMap: Record<string, AnswerPayload> = {};
      next.forEach((id) => (pendingMap[id] = id === current.id ? payload : answersRef.current[id]));
      persistCache(pendingMap);
      return next;
    });

    clearTimeout(debounceTimers.current[current.id]);
    debounceTimers.current[current.id] = setTimeout(() => flushOne(current.id, payload, index), 500);
  };

  // Retry all pending saves whenever we come back online, and on a slow poll as a safety net.
  useEffect(() => {
    const retryAll = () => {
      if (!navigator.onLine) return;
      pending.forEach((qid) => {
        const payload = answersRef.current[qid];
        if (payload) flushOne(qid, payload, index);
      });
    };
    const onOnline = () => {
      setOnline(true);
      retryAll();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const poll = setInterval(retryAll, 8000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, index]);

  // Heartbeat so the teacher monitor sees this student as online + current question.
  useEffect(() => {
    const id = setInterval(() => {
      if (navigator.onLine) heartbeatAction(attemptId, index).catch(() => {});
    }, 15000);
    return () => clearInterval(id);
  }, [attemptId, index]);

  const connState: ConnState = !online ? "offline" : pending.size > 0 ? "syncing" : "synced";

  const doSubmit = async () => {
    setSubmitting(true);
    // Flush anything still pending before submitting.
    await Promise.all(Array.from(pending).map((qid) => flushOne(qid, answersRef.current[qid], index)));
    await submitAttemptAction(attemptId);
    router.push(`/student/result/${attemptId}`);
  };

  const deadline = useMemo(() => {
    if (!settings.time_limit_seconds) return null;
    return new Date(attempt.started_at).getTime() + settings.time_limit_seconds * 1000;
  }, [attempt.started_at, settings.time_limit_seconds]);

  const answeredCount = questions.filter((q) => {
    const a = answers[q.id];
    if (!a) return false;
    switch (a.type) {
      case "multiple_choice": return a.selectedOptionId !== null;
      case "multi_select": return a.selectedOptionIds.length > 0;
      case "true_false": return a.value !== null;
      case "fill_blank": return a.value.trim() !== "";
      case "open_ended": return a.value.trim() !== "";
      case "reorder": return true;
      case "match": return Object.keys(a.pairs).length > 0;
      case "categorize": return Object.keys(a.categories).length > 0;
      case "drag_drop": return Object.keys(a.placements).length > 0;
    }
  }).length;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col">
      <div className="h-14 shrink-0 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between px-4 gap-3">
        <span className="text-sm font-medium">Câu {index + 1}/{questions.length}</span>
        <ConnectionStatus state={connState} />
        {deadline && <Timer deadline={deadline} onExpire={doSubmit} />}
      </div>

      <div className="h-1.5 bg-black/5">
        <div className="h-full bg-[var(--color-primary)] transition-all" style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
      </div>

      <div className="flex-1 p-6 max-w-2xl mx-auto w-full">
        {current.title && <p className="text-xs font-medium text-[var(--color-primary)] mb-1">{current.title}</p>}
        <div className="text-base font-medium mb-4 whitespace-pre-wrap">{current.content}</div>
        <QuestionPlayer question={current} value={answers[current.id]} onChange={handleAnswerChange} />
      </div>

      <div className="shrink-0 border-t border-[var(--border)] p-3 flex items-center justify-between max-w-2xl mx-auto w-full">
        <Button variant="secondary" icon={<ChevronLeft size={15} />} disabled={index === 0 || !settings.allow_back_navigation} onClick={() => setIndex((i) => i - 1)}>
          Câu trước
        </Button>
        <span className="text-xs text-[var(--muted)]">Đã trả lời {answeredCount}/{questions.length}</span>
        {index < questions.length - 1 ? (
          <Button variant="primary" onClick={() => setIndex((i) => i + 1)}>
            Câu tiếp <ChevronRight size={15} />
          </Button>
        ) : (
          <ConfirmButton variant="danger" onConfirm={doSubmit} confirmLabel="Nhấn lần nữa để nộp bài">
            <Flag size={14} /> {submitting ? "Đang nộp..." : "Nộp bài"}
          </ConfirmButton>
        )}
      </div>
    </div>
  );
}
