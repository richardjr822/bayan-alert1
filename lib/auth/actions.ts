"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { createSession, clearSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";
import type { UserRow } from "@/types/user";

export type AuthFormState = {
  error: string;
};

const initialState: AuthFormState = {
  error: "",
};

function getRequiredValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function registerResident(previousState: AuthFormState = initialState, formData: FormData): Promise<AuthFormState> {
  void previousState;

  const fullName = getRequiredValue(formData, "fullName");
  const email = normalizeEmail(getRequiredValue(formData, "email"));
  const contactNumber = getRequiredValue(formData, "contactNumber");
  const password = getRequiredValue(formData, "password");
  const confirmPassword = getRequiredValue(formData, "confirmPassword");

  if (!fullName || !email || !contactNumber || !password || !confirmPassword) {
    return { error: "Please complete all required fields." };
  }

  if (!isValidEmail(email)) {
    return { error: "Please enter a valid email address." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const { data: existingUser, error: existingError } = await supabaseServer
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingError) {
    return { error: "Unable to verify email availability." };
  }

  if (existingUser) {
    return { error: "Email is already registered." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const { error: insertError } = await supabaseServer.from("users").insert({
    full_name: fullName,
    email,
    password_hash: passwordHash,
    contact_number: contactNumber,
    role: "resident",
  });

  if (insertError) {
    return { error: "Unable to create your account." };
  }

  redirect("/login");
}

export async function loginResident(previousState: AuthFormState = initialState, formData: FormData): Promise<AuthFormState> {
  void previousState;

  const email = normalizeEmail(getRequiredValue(formData, "email"));
  const password = getRequiredValue(formData, "password");

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }

  const { data: user, error } = await supabaseServer
    .from("users")
    .select("id, full_name, email, password_hash, contact_number, role, created_at")
    .eq("email", email)
    .maybeSingle<UserRow>();

  if (error || !user) {
    return { error: "Invalid email or password." };
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    return { error: "Invalid email or password." };
  }

  await createSession({
    id: user.id,
    fullName: user.full_name,
    role: user.role,
  });

  redirect(user.role === "admin" ? "/dashboard" : "/report");
}

export async function logoutResident() {
  await clearSession();
  redirect("/");
}
