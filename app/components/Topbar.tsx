import Image from "next/image";
import Link from "next/link";
import { logoutResident } from "@/lib/auth/actions";
import { getSession } from "@/lib/auth/session";
import Container from "./Container";

export default async function Topbar() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-50 border-b-[3px] border-b-[var(--red)] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.08)]">
      <Container className="flex min-h-[72px] items-center justify-between gap-4">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <Image
            src="/app-logo.png"
            alt="BayanAlert"
            width={38}
            height={38}
            className="shrink-0"
          />
          <span className="text-[21px] font-extrabold text-[var(--dark)]">BayanAlert</span>
        </Link>

        <nav className="flex items-center gap-2">
          {session?.role !== "admin" ? (
            <Link
              className="inline-flex items-center gap-1.5 rounded-[6px] bg-[var(--red)] px-[14px] py-[9px] text-[11px] font-bold leading-none text-white shadow-[0_2px_8px_rgba(212,170,0,0.35)] transition hover:bg-[var(--red-dark)]"
              href="/report"
            >
              <i className="fa-solid fa-circle-exclamation"></i>
              <span className="hidden sm:inline">Report Emergency</span>
              <span className="sm:hidden">Report</span>
            </Link>
          ) : null}

          {session ? (
            <form action={logoutResident}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-[6px] border border-[var(--line)] bg-white px-[13px] py-[9px] text-[11px] font-semibold leading-none text-[var(--dark)] transition hover:bg-[var(--bg-gray)]"
              >
                <i className="fa-solid fa-right-from-bracket"></i>
                <span>Logout</span>
              </button>
            </form>
          ) : (
            <Link
              className="inline-flex items-center gap-1.5 rounded-[6px] border border-[var(--line)] bg-white px-[13px] py-[9px] text-[11px] font-semibold leading-none text-[var(--dark)] transition hover:bg-[var(--bg-gray)]"
              href="/login"
            >
              <i className="fa-solid fa-right-to-bracket"></i>
              <span>Login</span>
            </Link>
          )}
        </nav>
      </Container>
    </header>
  );
}
