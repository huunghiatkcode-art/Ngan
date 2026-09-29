"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";
import Button from "@/components/ui/Button";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable — user can still select the text manually */
        }
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Đã sao chép" : "Sao chép"}
    </Button>
  );
}
