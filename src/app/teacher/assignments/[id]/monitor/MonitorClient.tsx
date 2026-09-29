"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Attempt } from "@/types/database";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { Wifi, WifiOff } from "lucide-react";

export interface RosterRow {
  student_id: string;
  students: { full_name: string; student_code: string; username: string };
}

const STATUS_LABEL: Record<Attempt["status"], string> = {
  not_started: "Chưa bắt đầu",
  in_progress: "Đang làm",
  submitted: "Đã nộp",
  grading: "Đang chấm",
  graded: "Đã chấm",
  abandoned: "Bỏ dở",
};
const STATUS_TONE: Record<Attempt["status"], "neutral" | "warning" | "success"> = {
  not_started: "neutral",
  in_progress: "warning",
  submitted: "success",
  grading: "warning",
  graded: "success",
  abandoned: "neutral",
};

/** Online = a heartbeat/answer was seen in the last 30s (heartbeat pings every 15s). */
function isOnline(lastSeenAt: string) {
  return Date.now() - new Date(lastSeenAt).getTime() < 30_000;
}

export default function MonitorClient({
  assignmentId,
  initialRoster,
  initialAttempts,
}: {
  assignmentId: string;
  initialRoster: RosterRow[];
  initialAttempts: Attempt[];
}) {
  const [attempts, setAttempts] = useState<Record<string, Attempt>>(() =>
    Object.fromEntries(initialAttempts.map((a) => [a.student_id, a]))
  );
  const [connected, setConnected] = useState(false);
  const [, forceTick] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`assignment-monitor-${assignmentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attempts", filter: `assignment_id=eq.${assignmentId}` },
        (payload) => {
          const row = payload.new as Attempt;
          if (row?.student_id) setAttempts((prev) => ({ ...prev, [row.student_id]: row }));
        }
      )
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    // Re-render every 10s so the online/offline badge (derived from last_seen_at) stays fresh
    // even when no new realtime event has arrived.
    const tick = setInterval(() => forceTick((n) => n + 1), 10_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(tick);
    };
  }, [assignmentId]);

  const summary = {
    joined: initialRoster.length,
    inProgress: Object.values(attempts).filter((a) => a.status === "in_progress").length,
    submitted: Object.values(attempts).filter((a) => ["submitted", "grading", "graded"].includes(a.status)).length,
    online: Object.values(attempts).filter((a) => a.status === "in_progress" && isOnline(a.last_seen_at)).length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
        {connected ? <Wifi size={13} className="text-green-600" /> : <WifiOff size={13} className="text-amber-600" />}
        {connected ? "Đã kết nối realtime" : "Đang kết nối..."}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Đã tham gia", value: summary.joined },
          { label: "Đang làm bài", value: summary.inProgress },
          { label: "Đã nộp", value: summary.submitted },
          { label: "Đang online", value: summary.online },
        ].map((s) => (
          <Card key={s.label} className="p-3 text-center">
            <p className="text-2xl font-semibold">{s.value}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-black/[0.03] text-left text-xs text-[var(--muted)]">
            <tr>
              <th className="px-4 py-2 font-medium">Học sinh</th>
              <th className="px-4 py-2 font-medium">Trạng thái</th>
              <th className="px-4 py-2 font-medium">Câu hiện tại</th>
              <th className="px-4 py-2 font-medium">Tiến độ</th>
              <th className="px-4 py-2 font-medium">Điểm</th>
              <th className="px-4 py-2 font-medium">Online</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {initialRoster.map((r) => {
              const att = attempts[r.student_id];
              const online = att?.status === "in_progress" && isOnline(att.last_seen_at);
              return (
                <tr key={r.student_id}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium">{r.students.full_name}</p>
                    <p className="text-xs text-[var(--muted)]">{r.students.student_code}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={att ? STATUS_TONE[att.status] : "neutral"}>{att ? STATUS_LABEL[att.status] : "Chưa tham gia"}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-[var(--muted)]">
                    {att ? `Câu ${att.current_question_index + 1}` : "-"}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--muted)]">{att ? `${att.completion_percent}%` : "-"}</td>
                  <td className="px-4 py-2.5 font-medium">{att && att.status !== "not_started" ? `${att.score}/${att.max_score}` : "-"}</td>
                  <td className="px-4 py-2.5">
                    {online ? <span className="inline-flex items-center gap-1 text-green-600 text-xs">● Online</span> : <span className="text-xs text-[var(--muted)]">Offline</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
