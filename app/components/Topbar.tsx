import Image from "next/image";
import Link from "next/link";
import { logoutResident } from "@/lib/auth/actions";
import { getSession } from "@/lib/auth/session";
import Container from "./Container";
import ResidentNav from "./client/ResidentNav";

type TopbarProps = {
  notifications?: number;
};

export default async function Topbar({ notifications }: TopbarProps = {}) {
  const session = await getSession();
  const isResident = session?.role === "resident";
  const isAdmin = session?.role === "admin";

  return (
    <header className="sticky top-0 z-50 border-b-[3px] border-b-[var(--red)] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.08)]">
      <Container className="flex min-h-[72px] items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Image src="/app-logo.png" alt="BayanAlert" width={38} height={38} className="shrink-0" />
            <span className="text-[21px] font-extrabold text-[var(--dark)]">BayanAlert</span>
          </Link>
          <Link
            href="/track"
            className="hidden text-[13px] font-medium text-[var(--muted)] transition hover:text-[var(--text)] hover:underline sm:inline"
          >
            Track Report
          </Link>
        </div>

        <nav className="flex items-center gap-2">
          {isResident && typeof notifications === "number" ? (
            <ResidentNav fullName={session.fullName} notifications={notifications} />
          ) : isAdmin ? (
            <form action={logoutResident}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-[6px] border border-[var(--line)] bg-white px-[13px] py-[9px] text-[11px] font-semibold leading-none text-[var(--dark)] transition hover:bg-[var(--bg-gray)]"
              >
                <i className="fa-solid fa-right-from-bracket" />
                <span>Logout</span>
              </button>
            </form>
          ) : (
            <>
              <Link
                className="inline-flex items-center gap-1.5 rounded-[6px] bg-[var(--red)] px-[14px] py-[9px] text-[11px] font-bold leading-none text-white shadow-[0_2px_8px_rgba(212,170,0,0.35)] transition hover:bg-[var(--red-dark)]"
                href="/report"
              >
                <i className="fa-solid fa-circle-exclamation" />
                <span className="hidden sm:inline">Report Emergency</span>
                <span className="sm:hidden">Report</span>
              </Link>
              {session ? (
                <form action={logoutResident}>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-[6px] border border-[var(--line)] bg-white px-[13px] py-[9px] text-[11px] font-semibold leading-none text-[var(--dark)] transition hover:bg-[var(--bg-gray)]"
                  >
                    <i className="fa-solid fa-right-from-bracket" />
                    <span>Logout</span>
                  </button>
                </form>
              ) : (
                <Link
                  className="inline-flex items-center gap-1.5 rounded-[6px] border border-[var(--line)] bg-white px-[13px] py-[9px] text-[11px] font-semibold leading-none text-[var(--dark)] transition hover:bg-[var(--bg-gray)]"
                  href="/login"
                >
                  <i className="fa-solid fa-right-to-bracket" />
                  <span>Login</span>
                </Link>
              )}
            </>
          )}
        </nav>
      </Container>
    </header>
  );
}
