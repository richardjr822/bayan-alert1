"use client";

type StatCardProps = {
  value: number;
  label: string;
};

export default function StatCard({ value, label }: StatCardProps) {
  return (
    <article className="grid min-h-[150px] place-items-center rounded-lg border border-[var(--line)] bg-white text-center shadow-[0_2px_6px_rgba(0,0,0,0.06)]">
      <div className="text-[44px] font-bold leading-none text-[var(--red)]">{value}</div>
      <div className="mt-2 text-[14px] text-[var(--muted)]">{label}</div>
    </article>
  );
}
