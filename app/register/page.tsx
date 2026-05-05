import Image from "next/image";
import RegisterForm from "../components/client/RegisterForm";
import Topbar from "../components/Topbar";

export default function RegisterPage() {
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
            <div className="mt-8 space-y-3">
              {["Report emergencies instantly", "Track your report status", "Direct line to barangay officials"].map(
                (item) => (
                  <div key={item} className="flex items-center gap-2.5 text-left">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--red)]">
                      <i className="fa-solid fa-check text-[9px] text-white"></i>
                    </span>
                    <span className="text-[12px] text-white/65">{item}</span>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto bg-white px-6 py-12">
          <div className="w-full max-w-[420px]">
            <div className="mb-6 flex items-center gap-3 md:hidden">
              <Image src="/app-logo.png" alt="BayanAlert" width={38} height={38} />
              <div>
                <p className="text-[18px] font-extrabold text-[var(--dark)]">BayanAlert</p>
                <p className="text-[11px] text-[var(--muted)]">Brgy Sta Rita</p>
              </div>
            </div>
            <h1 className="text-[26px] font-extrabold text-[var(--dark)]">Create your account</h1>
            <p className="mb-8 mt-1 text-[14px] text-[var(--muted)]">
              Register as a resident of Brgy Sta. Rita
            </p>
            <RegisterForm />
          </div>
        </div>
      </main>
    </div>
  );
}
