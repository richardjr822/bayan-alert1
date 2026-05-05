import Image from "next/image";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-gray)]">
      <div className="relative flex items-center justify-center">
        <span className="absolute h-[72px] w-[72px] animate-spin rounded-full border-[3px] border-[var(--line)] border-t-[var(--red)]"></span>
        <Image
          src="/app-logo.png"
          alt="BayanAlert"
          width={48}
          height={48}
          className="rounded-xl"
          priority
        />
      </div>
      <p className="mt-5 text-[12px] font-semibold tracking-wide text-[var(--muted)]">Loading…</p>
    </div>
  );
}
