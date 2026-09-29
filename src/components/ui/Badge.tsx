import type { ReactNode } from "react";

const tones: Record<string, string> = {
  neutral: "bg-black/5 text-[var(--text)]",
  primary: "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
  success: "bg-green-100 text-green-700",
  danger: "bg-red-100 text-red-700",
  warning: "bg-amber-100 text-amber-700",
};

export default function Badge({ tone = "neutral", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <span className={`badge ${tones[tone]}`}>{children}</span>;
}
