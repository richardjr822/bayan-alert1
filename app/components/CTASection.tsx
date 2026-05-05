import Link from "next/link";
import Container from "./Container";

export default function CTASection() {
  return (
    <section className="bg-[var(--dark)] py-[80px]">
      <Container size="narrow">
        <div className="mx-auto max-w-[560px] text-center">
          <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(212,170,0,0.15)]">
            <i className="fa-solid fa-bell text-[28px] text-[var(--red)]"></i>
          </div>
          <h2 className="text-[28px] font-bold text-white sm:text-[36px]">Be Ready When It Matters</h2>
          <p className="mx-auto mt-4 max-w-[420px] text-[14px] leading-relaxed text-white/65">
            Create an account to track your submitted reports and receive real-time status updates from barangay
            officials.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-[6px] bg-[var(--red)] px-7 py-3.5 text-[14px] font-bold text-white shadow-[0_3px_16px_rgba(212,170,0,0.35)] transition hover:bg-[var(--red-dark)]"
            >
              <i className="fa-solid fa-user-plus"></i>
              Create an Account
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-[6px] border border-white/20 px-7 py-3.5 text-[14px] font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
            >
              <i className="fa-solid fa-right-to-bracket"></i>
              Sign In
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
