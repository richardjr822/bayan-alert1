"use client";

import type { InputHTMLAttributes } from "react";

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  id: string;
};

export default function TextInput({ label, id, className = "", ...props }: TextInputProps) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-2 block text-[12px] font-medium text-[var(--text)]">
        {label}
      </label>
      <input
        id={id}
        className={`w-full rounded-[5px] border border-[#d7dde5] bg-white px-3 py-3 text-[12px] text-[var(--text)] focus:border-[var(--red)] focus:outline-none focus:ring-4 focus:ring-[rgba(212,170,0,0.12)] ${className}`}
        {...props}
      />
    </div>
  );
}
