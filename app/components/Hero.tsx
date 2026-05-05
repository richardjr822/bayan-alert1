import Link from "next/link";
import Container from "./Container";

export default function Hero() {
  return (
    <section id="heroSection" className="bg-[linear-gradient(165deg,_#D4AA00_0%,_#C49F00_45%,_#B89400_100%)] text-white">
      <Container className="grid min-h-[430px] grid-cols-1 items-center gap-12 py-[72px] lg:grid-cols-[1.1fr_0.9fr]">
        <div className="max-w-[620px]">
          <h1 className="mb-2 text-[40px] font-extrabold leading-[1.05] sm:text-[52px]">BayanAlert</h1>
          <h2 className="text-[24px] font-bold leading-tight sm:text-[34px]">
            Community Emergency Reporting & Response System
          </h2>
          <p className="mt-4 text-[15px] leading-[1.9] text-white/90">
            Fast, reliable, and community-centered reporting for Brgy Sta Rita. Submit emergencies with location tagging
            and track responses in real time.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-[5px] bg-white px-6 py-3 text-[15px] font-bold text-[var(--red-dark)] shadow-[0_2px_8px_rgba(0,0,0,0.14)] transition hover:bg-white/90"
              href="/report"
            >
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>Report Emergency</span>
            </Link>
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-[5px] bg-[var(--dark)] px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-[#162235]"
              href="/dashboard"
            >
              <i className="fa-solid fa-chart-line"></i>
              <span>View Live Dashboard</span>
            </Link>
          </div>
        </div>
        <div className="grid place-items-center" aria-hidden="true">
          <i className="fa-solid fa-bell text-[120px] text-white/40 sm:text-[170px]"></i>
        </div>
      </Container>
    </section>
  );
}
