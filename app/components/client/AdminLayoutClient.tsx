"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutResident } from "@/lib/auth/actions";

const navSections = [
  {
    label: "Operations",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: "fa-solid fa-chart-pie" },
      { name: "Reports", href: "/dashboard/reports", icon: "fa-solid fa-file-lines" },
      { name: "Map", href: "/dashboard/map", icon: "fa-solid fa-map-location-dot" },
    ],
  },
  {
    label: "History & Insights",
    items: [
      { name: "History", href: "/dashboard/history", icon: "fa-solid fa-clock-rotate-left" },
      { name: "Analytics", href: "/dashboard/analytics", icon: "fa-solid fa-chart-line" },
    ],
  },

];

export default function AdminLayoutClient({
  children,
  adminName,
  pageTitle,
  pageSubtitle,
}: {
  children: React.ReactNode;
  adminName: string;
  pageTitle?: string;
  pageSubtitle?: string;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const initials = adminName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const headerConfig: Record<string, { title: string; subtitle: string; section: string }> = {
    "/dashboard": { title: "Command Center", subtitle: "Live overview of incoming incidents", section: "Operations" },
    "/dashboard/reports": { title: "Reports", subtitle: "Active incidents and response workflow", section: "Operations" },
    "/dashboard/history": { title: "History", subtitle: "Resolved and rejected reports", section: "History & Insights" },
    "/dashboard/map": { title: "Live Map", subtitle: "Geospatial view of active incidents", section: "Operations" },
    "/dashboard/analytics": { title: "Analytics", subtitle: "Trends and response performance", section: "History & Insights" },
    "/dashboard/settings": { title: "Settings", subtitle: "System preferences and access", section: "System" },
  };

  const currentHeader = headerConfig[pathname] ?? { title: "Admin", subtitle: "", section: "" };
  const displayTitle = pageTitle ?? currentHeader.title;
  const displaySubtitle = pageSubtitle ?? currentHeader.subtitle;

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-[#F7F6F2]">
      <aside
        className={`fixed left-0 top-0 z-50 hidden h-screen flex-col bg-[#0D1B2A] text-white transition-all duration-300 md:flex ${
          isCollapsed ? "w-[64px]" : "w-[240px]"
        }`}
      >
        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-white/10 px-4">
          {!isCollapsed ? (
            <div className="flex w-full items-center justify-between">
              <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden">
                <Image src="/app-logo.png" alt="BayanAlert" width={32} height={32} className="shrink-0" />
                <span className="text-[18px] font-display font-extrabold text-white tracking-wide">BayanAlert</span>
              </Link>

            </div>
          ) : (
            <Link href="/dashboard" className="mx-auto flex items-center justify-center">
              <Image src="/app-logo.png" alt="BayanAlert" width={32} height={32} className="shrink-0" />
            </Link>
          )}
        </div>
        
        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`absolute -right-4 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-[#D4AA00] text-[#0D1B2A] shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-transform hover:scale-110 ${
            isCollapsed ? "rotate-180" : ""
          }`}
          title="Toggle Sidebar"
          aria-label="Toggle sidebar"
        >
          <i className="fa-solid fa-chevron-left text-[12px]"></i>
        </button>

        <nav className="flex-1 overflow-y-auto py-6">
          <div className="space-y-4 px-2">
            {navSections.map((section) => (
              <div key={section.label}>
                {!isCollapsed ? (
                  <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                    {section.label}
                  </p>
                ) : null}
                <ul className="flex flex-col gap-2">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={`group flex min-h-[44px] items-center gap-3 rounded-lg py-2.5 transition-colors ${
                            isActive
                              ? "bg-white/10 font-semibold text-[#D4AA00] border-l-[3px] border-l-[#D4AA00] pl-[13px] pr-3" 
                              : "text-gray-300 hover:bg-white/5 hover:text-white border-l-[3px] border-l-transparent pl-[13px] pr-3"
                          }`}
                          title={isCollapsed ? item.name : undefined}
                        >
                          <i className={`${item.icon} w-5 text-center text-lg`}></i>
                          {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 font-bold text-[#D4AA00]">
              {initials}
            </div>
            {!isCollapsed && (
              <div className="flex flex-1 flex-col overflow-hidden">
                <span className="truncate text-sm font-semibold text-white">{adminName}</span>
                <span className="truncate text-xs text-gray-400">Administrator</span>
              </div>
            )}
          </div>
          <div className={`mt-4 ${isCollapsed ? "flex justify-center" : ""}`}>
            <form action={logoutResident} className={isCollapsed ? "w-full" : ""}>
              <button
                type="submit"
                className={`flex h-11 items-center gap-2 rounded-lg bg-white/5 px-3 text-sm text-gray-300 transition-colors hover:bg-red-500/10 hover:text-red-400 ${
                  isCollapsed ? "w-11 justify-center p-0" : "w-full justify-start"
                }`}
                title={isCollapsed ? "Logout" : undefined}
              >
                <i className="fa-solid fa-right-from-bracket w-5 text-center"></i>
                {!isCollapsed && <span>Logout</span>}
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main
        className={`page-enter flex-1 flex flex-col transition-all duration-300 ${
          isCollapsed ? "md:ml-[64px]" : "md:ml-[240px]"
        } pb-24 md:pb-0`}
      >
        <div className="border-b border-black/5 bg-white px-4 py-3 md:px-8 md:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                {currentHeader.section}
              </p>
              <h1 className="truncate font-display text-[18px] font-bold text-navy md:text-[24px]">{displayTitle}</h1>
              {displaySubtitle ? (
                <p className="truncate text-[12px] text-[var(--muted)] md:text-[13px]">{displaySubtitle}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2 md:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0D1B2A] text-[11px] font-bold text-[#D4AA00]">
                {initials}
              </div>
              <form action={logoutResident}>
                <button
                  type="submit"
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-black/10 bg-white px-2.5 text-[11px] font-semibold text-[#687689] transition active:bg-red-50 active:text-red-500"
                  aria-label="Logout"
                >
                  <i className="fa-solid fa-right-from-bracket" />
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-black/8 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="flex items-center">
          {[
            { name: "Dashboard", short: "Home", href: "/dashboard", icon: "fa-solid fa-chart-pie" },
            { name: "Reports", short: "Reports", href: "/dashboard/reports", icon: "fa-solid fa-file-lines" },
            { name: "Map", short: "Map", href: "/dashboard/map", icon: "fa-solid fa-map-location-dot" },
            { name: "History", short: "History", href: "/dashboard/history", icon: "fa-solid fa-clock-rotate-left" },
            { name: "Analytics", short: "Stats", href: "/dashboard/analytics", icon: "fa-solid fa-chart-line" },
          ].map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.name}
                className="relative flex flex-1 flex-col items-center justify-center gap-1 py-3"
              >
                {isActive && (
                  <span className="absolute inset-x-3 top-0 h-[2px] rounded-b-full bg-[#D4AA00]" />
                )}
                <i className={`${item.icon} text-[18px] transition-colors ${isActive ? "text-[#D4AA00]" : "text-[#b0b8c4]"}`} />
                <span className={`text-[10px] font-semibold transition-colors ${isActive ? "text-[#0D1B2A]" : "text-[#b0b8c4]"}`}>
                  {item.short}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
