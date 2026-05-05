"use client";

import type { TextareaHTMLAttributes } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  id: string;
};

export default function Textarea({ label, id, className = "", ...props }: TextareaProps) {
  return (
    <div className="mb-2">
      <label htmlFor={id} className="mb-2 block text-[12px] font-medium text-[var(--text)]">
        {label}
      </label>
      <textarea
        id={id}
        className={`w-full resize-y rounded-[5px] border border-[#d7dde5] bg-white px-3 py-3 text-[12px] text-[var(--text)] focus:border-[var(--red)] focus:outline-none focus:ring-4 focus:ring-[rgba(212,170,0,0.12)] ${className}`}
        {...props}
      />
    </div>
  );
}
