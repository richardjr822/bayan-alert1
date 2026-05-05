import Image from "next/image";
import { getSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";
import ReportFormClient from "../components/client/ReportFormClient";
import Topbar from "../components/Topbar";

export default async function ReportPage() {
  const session = await getSession();
  let defaultContact = "";
  if (session) {
    const { data } = await supabaseServer
      .from("users")
      .select("contact_number")
      .eq("id", session.id)
      .maybeSingle();
    defaultContact = data?.contact_number ?? "";
  }
  return (
    <div className="flex min-h-screen flex-col">
      <Topbar />
      <main className="relative flex flex-1 items-start justify-center overflow-hidden px-4 py-10 pb-16">
        <div className="absolute inset-0 bg-[var(--dark)]" />
        <div className="absolute inset-0">
          <Image
            src="/hero-bg.jpg"
            alt=""
            fill
            className="object-cover object-center opacity-30"
            sizes="100vw"
            priority
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(to_top,_rgba(31,45,66,0.98)_0%,_rgba(31,45,66,0.65)_100%)]" />

        <div className="relative z-10 w-full max-w-[600px]">
          <div className="mb-7 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--red)]/40 bg-[var(--red)]/10 px-4 py-1.5 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--red)] opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--red)]"></span>
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--red)]">Emergency Report</span>
            </div>
            <h1 className="text-[28px] font-extrabold leading-tight text-white sm:text-[34px]">
              Submit an Emergency Report
            </h1>
            <p className="mt-2 text-[13px] text-white/50">
              Provide accurate details so responders can reach you quickly and safely.
            </p>
          </div>

          <ReportFormClient defaultContact={defaultContact} />

          <p className="mt-5 text-center text-[11px] text-white/30">
            <i className="fa-solid fa-lock mr-1"></i>
            No account required &mdash; report as a guest
          </p>
        </div>
      </main>
    </div>
  );
}
