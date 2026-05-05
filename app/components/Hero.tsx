import Image from "next/image";
import Link from "next/link";
import Container from "./Container";

export default function Hero() {
  return (
    <section className="relative flex min-h-[calc(100vh-75px)] items-center overflow-hidden">
      <div className="absolute inset-0 bg-[var(--dark)]" />
      <div className="absolute inset-0">
        <Image
          src="/hero-bg.jpg"
          alt=""
          fill
          className="object-cover object-center opacity-40"
          priority
          loading="eager"
          sizes="100vw"
          quality={85}
        />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(to_top,_rgba(31,45,66,0.98)_0%,_rgba(31,45,66,0.55)_50%,_rgba(212,170,0,0.22)_100%)]" />

      <Container className="relative z-10 py-20 text-center">
        <div className="mx-auto max-w-[600px]">

          <div className="mb-8 inline-flex items-center gap-3 rounded-full bg-white/10 py-2 pl-2 pr-5 ring-1 ring-white/15 backdrop-blur-sm">
            <Image
              src="/starita.png"
              alt="Brgy Sta. Rita Official Seal"
              width={36}
              height={36}
              className="rounded-full ring-2 ring-white/20"
            />
            <div className="text-left">
              <p className="text-[11px] font-bold uppercase tracking-widest text-white">Barangay Sta. Rita</p>
              <p className="text-[10px] text-white/55">Lungsod ng Olongapo</p>
            </div>
          </div>

          <h1 className="mb-4 text-[52px] font-extrabold leading-[0.95] tracking-tight text-white sm:text-[76px]">
            Bayan<span className="text-[var(--red)]">Alert</span>
          </h1>
          <p className="mx-auto mb-12 max-w-[380px] text-[15px] leading-relaxed text-white/60 sm:text-[16px]">
            Report emergencies directly to barangay officials. Fast, precise, real-time.
          </p>

          <div className="flex justify-center sm:hidden">
            <Link
              href="/report"
              className="relative flex h-48 w-48 flex-col items-center justify-center rounded-full bg-white text-[var(--red-dark)] shadow-[0_12px_48px_rgba(0,0,0,0.5)]"
            >
              <span className="absolute inset-0 animate-ping rounded-full bg-white/20"></span>
              <span className="absolute inset-[-10px] rounded-full ring-1 ring-white/20"></span>
              <span className="absolute inset-[-20px] rounded-full ring-1 ring-white/10"></span>
              <i className="fa-solid fa-circle-exclamation mb-2 text-[44px]"></i>
              <span className="text-[13px] font-extrabold tracking-wide">REPORT</span>
              <span className="text-[13px] font-extrabold tracking-wide">EMERGENCY</span>
            </Link>
          </div>

          <div className="hidden sm:flex sm:flex-col sm:items-center sm:gap-4">
            <Link
              href="/report"
              className="inline-flex items-center justify-center gap-3 rounded-[10px] bg-[var(--red)] px-12 py-5 text-[20px] font-extrabold text-white shadow-[0_4px_32px_rgba(212,170,0,0.40)] transition hover:bg-[var(--red-dark)] active:scale-[0.98]"
            >
              <i className="fa-solid fa-circle-exclamation text-[22px]"></i>
              REPORT EMERGENCY
            </Link>
            <p className="text-[12px] text-white/35">No account required to report</p>
          </div>

        </div>
      </Container>

      <div className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1.5 sm:flex">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">Scroll</p>
        <i className="fa-solid fa-chevron-down animate-bounce text-[11px] text-white/30"></i>
      </div>
    </section>
  );
}
