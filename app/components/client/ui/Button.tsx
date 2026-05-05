"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "dark" | "red" | "resolve";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  dark: "bg-[var(--dark)]",
  red: "bg-[var(--red)] hover:bg-[var(--red-dark)]",
  resolve: "bg-[#1f8d53] hover:bg-[#167241]",
};

export default function Button({ variant = "dark", className = "", children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-[5px] px-4 py-[11px] text-[12px] font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-70 ${
        variantClasses[variant]
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
