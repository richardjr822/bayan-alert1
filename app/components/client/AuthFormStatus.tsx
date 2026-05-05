"use client";

import { useFormStatus } from "react-dom";

type AuthFormStatusProps = {
  label: string;
  pendingLabel: string;
  icon: string;
};

export default function AuthFormStatus({ label, pendingLabel, icon }: AuthFormStatusProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-1.5 rounded-[5px] bg-[var(--red)] px-4 py-[11px] text-[12px] font-semibold text-white transition hover:bg-[var(--red-dark)] disabled:cursor-not-allowed disabled:opacity-70"
    >
      <i className={pending ? "fa-solid fa-spinner fa-spin" : icon}></i>
      <span>{pending ? pendingLabel : label}</span>
    </button>
  );
}
