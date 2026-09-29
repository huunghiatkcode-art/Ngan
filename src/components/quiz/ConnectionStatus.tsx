"use client";

export type ConnState = "offline" | "syncing" | "synced";

export default function ConnectionStatus({ state }: { state: ConnState }) {
  const map = {
    offline: { dot: "bg-red-500", label: "Mất kết nối — đáp án đang lưu trên thiết bị" },
    syncing: { dot: "bg-amber-500 animate-pulse", label: "Đang đồng bộ..." },
    synced: { dot: "bg-green-500", label: "Đã đồng bộ" },
  } as const;
  const s = map[state];
  return (
    <span className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
