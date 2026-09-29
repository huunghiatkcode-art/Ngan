import type { ButtonHTMLAttributes, ReactNode } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  icon?: ReactNode;
}

export default function Button({ variant = "secondary", size = "md", icon, className = "", children, ...rest }: Props) {
  const variantClass = variant === "primary" ? "btn-primary" : variant === "danger" ? "btn-danger" : variant === "ghost" ? "hover:bg-black/5" : "btn-secondary";
  return (
    <button className={`btn ${variantClass} ${size === "sm" ? "text-xs px-2.5 py-1.5" : ""} ${className}`} {...rest}>
      {icon}
      {children}
    </button>
  );
}
