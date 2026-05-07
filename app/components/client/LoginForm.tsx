"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { loginResident, type AuthFormState } from "@/lib/auth/actions";

const initialState: AuthFormState = { error: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[8px] bg-[var(--red)] text-[15px] font-semibold text-[var(--dark)] transition hover:bg-[var(--red-dark)] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? (
        <>
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Signing in...</span>
        </>
      ) : (
        <span>Sign In</span>
      )}
    </button>
  );
}

export default function LoginForm() {
  const [state, formAction] = useActionState(loginResident, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-[var(--text)]">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="email@example.com"
          autoComplete="email"
          required
          className="w-full rounded-[8px] border border-[var(--line)] bg-white px-4 py-3 text-[14px] text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--red)] focus:outline-none focus:ring-4 focus:ring-[rgba(212,170,0,0.12)] md:text-[14px]"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium text-[var(--text)]">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="w-full rounded-[8px] border border-[var(--line)] bg-white px-4 py-3 pr-11 text-[14px] text-[var(--text)] focus:border-[var(--red)] focus:outline-none focus:ring-4 focus:ring-[rgba(212,170,0,0.12)]"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] transition hover:text-[var(--text)]"
          >
            <i className={showPassword ? "fa-solid fa-eye-slash text-[15px]" : "fa-solid fa-eye text-[15px]"} />
          </button>
        </div>
      </div>

      {state.error ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-[#f3c6c6] bg-[#fff5f5] px-4 py-3 text-[13px] font-medium text-[#c0392b]">
          <i className="fa-solid fa-circle-exclamation mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <SubmitButton />

      <p className="text-center text-[13px] text-[var(--muted)]">
        New to BayanAlert?{" "}
        <Link href="/register" className="font-bold text-[var(--red)] hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
