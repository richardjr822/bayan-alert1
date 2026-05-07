import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--bg-gray)] py-8">
      <div className="mx-auto flex w-[min(1200px,92vw)] flex-col items-center gap-3 text-center text-[12px] text-[var(--muted)] sm:flex-row sm:justify-between sm:text-left">
        <p>&copy; {new Date().getFullYear()} BayanAlert &mdash; Barangay Sta. Rita, Olongapo City</p>
        <div className="flex items-center gap-4">
          <Link href="/track" className="transition hover:text-[var(--text)] hover:underline">
            Track Report
          </Link>
          <span className="text-[var(--line)]">|</span>
          <span>Emergency Hotline: 911</span>
        </div>
      </div>
    </footer>
  );
}
