"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { loginResident, type AuthFormState } from "@/lib/auth/actions";
import AuthFormStatus from "./AuthFormStatus";
import TextInput from "./ui/TextInput";

const initialState: AuthFormState = {
  error: "",
};

export default function LoginForm() {
  const [state, formAction] = useActionState(loginResident, initialState);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form action={formAction} className="space-y-1">
      {state.error ? (
        <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-[#f3c6c6] bg-[#fff5f5] px-4 py-3 text-[13px] font-medium text-[#c0392b]">
          <i className="fa-solid fa-circle-exclamation mt-0.5 shrink-0"></i>
          <span>{state.error}</span>
        </div>
      ) : null}
      <TextInput
        id="email"
        name="email"
        label="Email address"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        autoComplete="email"
        required
      />
      <TextInput
        id="password"
        name="password"
        label="Password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
        required
      />
      <div className="pt-3">
        <AuthFormStatus label="Sign In" pendingLabel="Signing In..." icon="fa-solid fa-right-to-bracket" />
        <p className="mt-3 text-center text-[11px] leading-relaxed text-[var(--muted)]">
          By signing in, you agree to our{" "}
          <span className="font-medium text-[var(--text)]">Terms and Conditions</span> and acknowledge
          our{" "}
          <span className="font-medium text-[var(--text)]">Privacy Policy</span> in accordance with
          RA 10173.
        </p>
      </div>
      <div className="border-t border-[var(--line)] pt-5 text-center text-[13px] text-[var(--muted)]">
        New to BayanAlert?{" "}
        <Link href="/register" className="font-semibold text-[var(--red-dark)] hover:underline">
          Create an account
        </Link>
      </div>
    </form>
  );
}
