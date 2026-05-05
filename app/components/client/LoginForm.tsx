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
    <form
      action={formAction}
      className="mx-auto max-w-[520px] rounded-[10px] border border-[#dfe3e8] bg-[#efeff1] p-6 shadow-[0_2px_7px_rgba(0,0,0,0.06)]"
    >
      {state.error ? (
        <div className="mb-4 rounded-[5px] border border-[#f3b6b6] bg-[#fff1f1] px-3 py-3 text-[12px] font-medium text-[#a63232]">
          {state.error}
        </div>
      ) : null}
      <TextInput
        id="email"
        name="email"
        label="Email *"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        autoComplete="email"
        required
      />
      <TextInput
        id="password"
        name="password"
        label="Password *"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
        required
      />
      <AuthFormStatus label="Login" pendingLabel="Logging In..." icon="fa-solid fa-right-to-bracket" />
      <p className="mt-4 text-center text-[12px] text-[var(--muted)]">
        New resident?{" "}
        <Link href="/register" className="font-semibold text-[var(--red-dark)]">
          Register
        </Link>
      </p>
    </form>
  );
}
