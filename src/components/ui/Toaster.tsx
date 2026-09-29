"use client";
import { create } from "zustand";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

interface Toast { id: string; message: string; kind: "success" | "error" | "info"; }
interface ToastState { toasts: Toast[]; show: (message: string, kind?: Toast["kind"]) => void; dismiss: (id: string) => void; }

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  show: (message, kind = "info") => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

const icon = { success: <CheckCircle2 size={16} className="text-green-600" />, error: <XCircle size={16} className="text-red-600" />, info: <Info size={16} className="text-[var(--color-primary)]" /> };

export default function Toaster() {
  const { toasts, dismiss } = useToast();
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <div key={t.id} className="card shadow-lg px-3 py-2.5 flex items-start gap-2">
          {icon[t.kind]}
          <p className="text-sm flex-1">{t.message}</p>
          <button onClick={() => dismiss(t.id)} className="text-[var(--muted)] hover:text-[var(--text)]"><X size={13} /></button>
        </div>
      ))}
    </div>
  );
}
