"use client";
import { useState } from "react";
import Button from "./Button";

/** A button that requires a second click within 3s to actually fire (lightweight inline confirm). */
export default function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = "Nhấn lần nữa để xác nhận",
  variant = "danger",
  size = "sm",
}: {
  onConfirm: () => void;
  children: React.ReactNode;
  confirmLabel?: string;
  variant?: "danger" | "secondary";
  size?: "sm" | "md";
}) {
  const [armed, setArmed] = useState(false);
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={() => {
        if (armed) {
          onConfirm();
          setArmed(false);
        } else {
          setArmed(true);
          setTimeout(() => setArmed(false), 3000);
        }
      }}
    >
      {armed ? confirmLabel : children}
    </Button>
  );
}
