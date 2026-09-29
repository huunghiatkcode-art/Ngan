import type { ReactNode } from "react";

export default function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-4">
      <div className="text-[var(--muted)] mb-3">{icon}</div>
      <h3 className="font-semibold text-base">{title}</h3>
      {description && <p className="text-sm text-[var(--muted)] mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
