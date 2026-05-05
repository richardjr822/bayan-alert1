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
  const [privacyConsent, setPrivacyConsent] = useState(false);

  return (
    <form action={formAction} className="space-y-1">
      {state.error ? (
        <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-[#f3c6c6] bg-[#fff5f5] px-4 py-3 text-[13px] font-medium text-[#c0392b]">
          <i className="fa-solid fa-circle-exclamation mt-0.5 shrink-0"></i>
          <span>{state.error}</span>
        </div>
      ) : null}
      <TextInput
        id="fullName"
        name="fullName"
        label="Full Name"
        type="text"
        value={fullName}
        onChange={(event) => setFullName(event.target.value)}
        autoComplete="name"
        required
      />
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
        id="contactNumber"
        name="contactNumber"
        label="Contact Number"
        type="tel"
        value={contactNumber}
        onChange={(event) => setContactNumber(event.target.value)}
        autoComplete="tel"
        required
      />
      <TextInput
        id="password"
        name="password"
        label="Password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="new-password"
        required
      />
      <TextInput
        id="confirmPassword"
        name="confirmPassword"
        label="Confirm Password"
        type="password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        autoComplete="new-password"
        required
      />

      <div className="rounded-xl border border-[#e3e6eb] bg-[var(--bg-gray)] p-4">
        <div className="mb-2 flex items-center gap-2">
          <i className="fa-solid fa-shield-halved text-[14px] text-[var(--red)]"></i>
          <p className="text-[12px] font-bold text-[var(--text)]">
            Data Privacy Notice &mdash; RA 10173
          </p>
        </div>
        <p className="text-[11px] leading-relaxed text-[var(--muted)]">
          In accordance with the <strong className="text-[var(--text)]">Data Privacy Act of 2012 (Republic Act 10173)</strong>,
          Barangay Sta. Rita collects your personal information (name, email, contact number) solely
          for emergency reporting and response coordination. Your data will be processed only by
          authorized barangay officials and will not be shared with third parties without your
          consent. You have the right to access, correct, or withdraw your information at any time
          by contacting the barangay office.
        </p>
        <label className="mt-3 flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            required
            checked={privacyConsent}
            onChange={(e) => setPrivacyConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--red)]"
          />
          <span className="text-[11px] leading-relaxed text-[var(--text)]">
            I have read and understood the Data Privacy Notice. I consent to the collection and
            processing of my personal information for emergency reporting purposes.
          </span>
        </label>
      </div>

      <div className="pt-3">
        <AuthFormStatus label="Create Account" pendingLabel="Creating Account..." icon="fa-solid fa-user-plus" />
      </div>
      <div className="border-t border-[var(--line)] pt-5 text-center text-[13px] text-[var(--muted)]">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[var(--red-dark)] hover:underline">
          Sign in
        </Link>
      </div>
    </form>
  );
}
