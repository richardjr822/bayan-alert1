"use client";

import type { SelectHTMLAttributes } from "react";

type Option = {
  value: string;
  label: string;
};

type SelectInputProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  id: string;
  options: Option[];
  placeholder?: string;
};

export default function SelectInput({ label, id, options, placeholder, className = "", ...props }: SelectInputProps) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-2 block text-[12px] font-medium text-[var(--text)]">
        {label}
      </label>
      <select
        id={id}
        className={`w-full rounded-[5px] border border-[#d7dde5] bg-white px-3 py-3 text-[12px] text-[var(--text)] focus:border-[var(--red)] focus:outline-none focus:ring-4 focus:ring-[rgba(212,170,0,0.12)] ${className}`}
        {...props}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
