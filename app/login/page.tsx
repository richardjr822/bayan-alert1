import Image from "next/image";
import LoginForm from "../components/client/LoginForm";
import Topbar from "../components/Topbar";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Topbar />
      <main className="flex flex-1">
        <div className="relative hidden flex-none flex-col items-center justify-center overflow-hidden p-10 md:flex md:w-[42%] lg:w-[38%]">
          <div className="absolute inset-0 bg-[var(--dark)]" />
          <div className="absolute inset-0">
            <Image
              src="/hero-bg.jpg"
              alt=""
              fill
              className="object-cover object-center opacity-35"
              sizes="380px"
            />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(155deg,_rgba(212,170,0,0.28)_0%,_rgba(31,45,66,0.94)_100%)]" />
          <div className="relative z-10 flex flex-col items-center text-center">
            <Image src="/app-logo.png" alt="BayanAlert" width={72} height={72} />
            <h2 className="mt-4 text-[24px] font-extrabold text-white">BayanAlert</h2>
            <p className="text-[11px] text-white/45">Emergency Reporting System</p>
            <div className="my-7 h-px w-12 bg-white/20" />
            <Image
              src="/starita.png"
              alt="Brgy Sta. Rita Official Seal"
              width={68}
              height={68}
              className="rounded-full ring-2 ring-white/25"
            />
            <p className="mt-3 text-[12px] font-semibold text-white/80">Barangay Sta. Rita</p>
            <p className="text-[11px] text-white/40">Lungsod ng Olongapo</p>
            <div className="mt-8 rounded-xl bg-white/[0.07] p-4 text-left ring-1 ring-white/10">
              <p className="text-[12px] leading-relaxed text-white/60 italic">
                &ldquo;Fast, precise emergency reporting directly to your barangay officials.&rdquo;
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto bg-white px-6 py-12">
          <div className="w-full max-w-[400px]">
            <div className="mb-6 flex items-center gap-3 md:hidden">
              <Image src="/app-logo.png" alt="BayanAlert" width={38} height={38} />
              <div>
                <p className="text-[18px] font-extrabold text-[var(--dark)]">BayanAlert</p>
                <p className="text-[11px] text-[var(--muted)]">Brgy Sta Rita</p>
              </div>
            </div>
            <h1 className="text-[26px] font-extrabold text-[var(--dark)]">Welcome back</h1>
            <p className="mb-8 mt-1 text-[14px] text-[var(--muted)]">Sign in to your resident account</p>
            <LoginForm />
          </div>
        </div>
      </main>
    </div>
  );
}
