import Link from "next/link";
import { logoutResident } from "@/lib/auth/actions";
import { getSession } from "@/lib/auth/session";
import Container from "./Container";

export default async function Topbar() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-50 bg-white shadow-[0_1px_0_rgba(0,0,0,0.08)]">
      <Container className="min-h-[66px] flex items-center justify-between">
        <Link className="inline-flex items-center gap-2 text-[30px] font-extrabold text-[var(--red)]" href="/">
          <i className="fa-solid fa-triangle-exclamation text-[28px]"></i>
          <span>BayanAlert</span>
        </Link>
        <nav className="inline-flex flex-wrap items-center gap-2.5">
          <Link
            className="inline-flex items-center gap-1.5 rounded-[5px] bg-[var(--dark)] px-[13px] py-[9px] text-[11px] font-semibold leading-none text-white"
            href="/dashboard"
          >
            <i className="fa-solid fa-chart-line"></i>
            <span>Live Dashboard</span>
          </Link>
          {session?.role !== "admin" ? (
            <Link
              className="inline-flex items-center gap-1.5 rounded-[5px] bg-[var(--red)] px-[13px] py-[9px] text-[11px] font-semibold leading-none text-white"
              href="/report"
            >
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>Report Emergency</span>
            </Link>
          ) : null}
          {session ? (
            <form action={logoutResident}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-[5px] bg-white px-[13px] py-[9px] text-[11px] font-semibold leading-none text-[var(--dark)] ring-1 ring-[var(--line)]"
              >
                <i className="fa-solid fa-right-from-bracket"></i>
                <span>Logout</span>
              </button>
            </form>
          ) : (
            <>
              <Link
                className="inline-flex items-center gap-1.5 rounded-[5px] bg-white px-[13px] py-[9px] text-[11px] font-semibold leading-none text-[var(--dark)] ring-1 ring-[var(--line)]"
                href="/login"
              >
                <i className="fa-solid fa-right-to-bracket"></i>
                <span>Login</span>
              </Link>
              <Link
                className="inline-flex items-center gap-1.5 rounded-[5px] bg-white px-[13px] py-[9px] text-[11px] font-semibold leading-none text-[var(--dark)] ring-1 ring-[var(--line)]"
                href="/register"
              >
                <i className="fa-solid fa-user-plus"></i>
                <span>Register</span>
              </Link>
            </>
          )}
        </nav>
      </Container>
      <div className="h-[18px] bg-[linear-gradient(180deg,_#D4AA00_0%,_#B98F00_100%)]"></div>
    </header>
  );
}
