"use client";
import { useMemo, useState } from "react";

function shuffleStable<T>(arr: T[]): T[] {
  // Client-only shuffle is fine here: the server already gave us `right`
  // pre-shuffled via the seeded shuffle; we just render in the given order.
  return arr;
}

export default function MatchRenderer({
  left,
  right,
  value,
  onChange,
  disabled,
}: {
  left: { id: string; text: string }[];
  right: { id: string; text: string }[];
  value: Record<string, string>;
  onChange: (pairs: Record<string, string>) => void;
  disabled?: boolean;
}) {
  const rightOrder = useMemo(() => shuffleStable(right), [right]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const matchedRightIds = new Set(Object.values(value));

  const pickRight = (rightId: string) => {
    if (disabled || !selectedLeft) return;
    onChange({ ...value, [selectedLeft]: rightId });
    setSelectedLeft(null);
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        {left.map((p) => (
          <button key={p.id} type="button" disabled={disabled || !!value[p.id]} onClick={() => setSelectedLeft(p.id)}
            className={`w-full text-left px-3 py-2.5 rounded-lg border-2 text-sm ${
              value[p.id] ? "border-[var(--color-success)] bg-green-50" : selectedLeft === p.id ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5" : "border-[var(--border)]"
            }`}
          >
            {p.text}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {rightOrder.map((p) => (
          <button key={p.id} type="button" disabled={disabled || matchedRightIds.has(p.id)} onClick={() => pickRight(p.id)}
            className={`w-full text-left px-3 py-2.5 rounded-lg border-2 text-sm ${matchedRightIds.has(p.id) ? "border-[var(--color-success)] bg-green-50 opacity-60" : "border-[var(--border)]"}`}
          >
            {p.text}
          </button>
        ))}
      </div>
    </div>
  );
}
