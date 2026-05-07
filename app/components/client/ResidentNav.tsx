"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logoutResident } from "@/lib/auth/actions";

type ResidentNavProps = {
  fullName: string;
  notifications: number;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function ResidentNav({ fullName, notifications }: ResidentNavProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const firstName = fullName.split(" ")[0];

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-1.5">
      <button className="relative flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-[var(--bg-gray)]">
        <i className="fa-solid fa-bell text-[15px] text-[var(--muted)]" />
        {notifications > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--red)] px-1 text-[9px] font-extrabold text-white">
            {notifications > 9 ? "9+" : notifications}
          </span>
        ) : null}
      </button>

      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-full py-1 pl-1.5 pr-2.5 transition hover:bg-[var(--bg-gray)]"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--dark)] text-[11px] font-bold text-white">
            {getInitials(fullName)}
          </div>
          <span className="hidden text-[12px] font-semibold text-[var(--text)] sm:inline">
            Hi, {firstName}
          </span>
          <i
            className={`fa-solid fa-chevron-down text-[9px] text-[var(--muted)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open ? (
          <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-[var(--line)] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
            <div className="border-b border-[var(--line)] px-4 py-3">
              <p className="truncate text-[13px] font-semibold text-[var(--text)]">{fullName}</p>
              <p className="text-[11px] text-[var(--muted)]">Resident</p>
            </div>
            <div className="py-1.5">
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-[var(--text)] transition hover:bg-[var(--bg-gray)]"
              >
                <i className="fa-solid fa-chart-line w-4 text-center text-[var(--muted)]" />
                My Reports
              </Link>
              <Link
                href="/report"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-[var(--text)] transition hover:bg-[var(--bg-gray)]"
              >
                <i className="fa-solid fa-circle-exclamation w-4 text-center text-[var(--muted)]" />
                Submit Report
              </Link>
            </div>
            <div className="border-t border-[var(--line)] py-1.5">
              <form action={logoutResident}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] text-[#c0392b] transition hover:bg-[#fff5f5]"
                >
                  <i className="fa-solid fa-right-from-bracket w-4 text-center" />
                  Logout
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
