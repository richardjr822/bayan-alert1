"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const SPLASH_KEY = "bayan_splash_done";

export default function AppSplash() {
  const [phase, setPhase] = useState<"visible" | "fading" | "gone">("visible");

  useEffect(() => {
    if (sessionStorage.getItem(SPLASH_KEY)) {
      const t = setTimeout(() => setPhase("gone"), 0);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => {
      setPhase("fading");
      sessionStorage.setItem(SPLASH_KEY, "1");
    }, 1400);

    return () => clearTimeout(t);
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      style={{ transition: "opacity 0.5s ease", opacity: phase === "fading" ? 0 : 1 }}
      onTransitionEnd={() => setPhase("gone")}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#1f2d42]/60 backdrop-blur-[2px] backdrop-saturate-150"
      aria-hidden="true"
    >
      <div className="relative flex items-center justify-center">
        <span className="bayan-splash-ring absolute h-28 w-28 rounded-full border-[3px] border-[#D4AA00]/30"></span>
        <span className="bayan-splash-ring-outer absolute h-36 w-36 rounded-full border-[2px] border-[#D4AA00]/15"></span>
        <Image
          src="/app-logo.png"
          alt="BayanAlert"
          width={72}
          height={72}
          className="rounded-2xl shadow-lg"
          priority
        />
      </div>

      <p className="mt-7 text-[22px] font-extrabold tracking-tight text-white">BayanAlert</p>
      <p className="mt-1 text-[12px] font-medium text-[#D4AA00]">Brgy. Sta. Rita · Olongapo City</p>

      <div className="mt-10 flex items-center gap-1.5">
        <span className="bayan-dot h-1.5 w-1.5 rounded-full bg-[#D4AA00]" style={{ animationDelay: "0ms" }}></span>
        <span className="bayan-dot h-1.5 w-1.5 rounded-full bg-[#D4AA00]" style={{ animationDelay: "200ms" }}></span>
        <span className="bayan-dot h-1.5 w-1.5 rounded-full bg-[#D4AA00]" style={{ animationDelay: "400ms" }}></span>
      </div>
    </div>
  );
}
