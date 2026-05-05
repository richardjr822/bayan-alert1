import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { UserSession } from "@/types/user";

const sessionCookieName = "bayan_alert_session";
const sessionDuration = 60 * 60 * 24 * 7;

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!secret) {
    throw new Error("Missing session secret");
  }

  return secret;
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function createSessionValue(session: UserSession) {
  const payload = encode(JSON.stringify(session));
  return `${payload}.${sign(payload)}`;
}

function parseSessionValue(value: string | undefined): UserSession | null {
  if (!value) return null;

  const [payload, signature] = value.split(".");

  if (!payload || !signature) return null;

  const expectedSignature = sign(payload);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;

  const parsed = JSON.parse(decode(payload)) as Partial<UserSession>;

  if (!parsed.id || !parsed.fullName || !parsed.role) return null;
  if (parsed.role !== "resident" && parsed.role !== "admin") return null;

  return {
    id: parsed.id,
    fullName: parsed.fullName,
    role: parsed.role,
  };
}

export async function createSession(session: UserSession) {
  const cookieStore = await cookies();

  cookieStore.set(sessionCookieName, createSessionValue(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionDuration,
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  return parseSessionValue(cookieStore.get(sessionCookieName)?.value);
}

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
}
