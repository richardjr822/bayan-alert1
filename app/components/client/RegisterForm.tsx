"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { registerResident, type AuthFormState } from "@/lib/auth/actions";
import AuthFormStatus from "./AuthFormStatus";
import TextInput from "./ui/TextInput";

const initialState: AuthFormState = {
  error: "",
};

export default function RegisterForm() {
  const [state, formAction] = useActionState(registerResident, initialState);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
        id="fullName"
        name="fullName"
        label="Full Name *"
        type="text"
        value={fullName}
        onChange={(event) => setFullName(event.target.value)}
        autoComplete="name"
        required
      />
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
        id="contactNumber"
        name="contactNumber"
        label="Contact Number *"
        type="tel"
        value={contactNumber}
        onChange={(event) => setContactNumber(event.target.value)}
        autoComplete="tel"
        required
      />
      <TextInput
        id="password"
        name="password"
        label="Password *"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="new-password"
        required
      />
      <TextInput
        id="confirmPassword"
        name="confirmPassword"
        label="Confirm Password *"
        type="password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        autoComplete="new-password"
        required
      />
      <AuthFormStatus label="Create Account" pendingLabel="Creating Account..." icon="fa-solid fa-user-plus" />
      <p className="mt-4 text-center text-[12px] text-[var(--muted)]">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-[var(--red-dark)]">
          Login
        </Link>
      </p>
    </form>
  );
}
