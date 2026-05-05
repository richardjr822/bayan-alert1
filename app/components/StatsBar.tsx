import { supabaseServer } from "@/lib/supabase/server";
import Container from "./Container";

async function getStats() {
  const [{ count: total }, { count: active }, { count: resolved }] = await Promise.all([
    supabaseServer.from("reports").select("*", { count: "exact", head: true }),
    supabaseServer
      .from("reports")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "verified", "in_progress"]),
    supabaseServer
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "resolved"),
  ]);
  return { total: total ?? 0, active: active ?? 0, resolved: resolved ?? 0 };
}

type StatItemProps = {
  value: number;
  label: string;
  colorClass: string;
  icon: string;
};

function StatItem({ value, label, colorClass, icon }: StatItemProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-6 py-4 text-center">
      <i className={`${icon} ${colorClass} mb-1 text-[16px]`}></i>
      <span className={`text-[34px] font-extrabold leading-none ${colorClass}`}>{value}</span>
      <span className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">{label}</span>
    </div>
  );
}

export default async function StatsBar() {
  const { total, active, resolved } = await getStats();

  return (
    <div className="border-b border-[var(--line)] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
      <Container>
        <div className="grid grid-cols-3 divide-x divide-[var(--line)]">
          <StatItem value={total} label="Total Reports" colorClass="text-[var(--text)]" icon="fa-solid fa-clipboard-list" />
          <StatItem value={active} label="Active Now" colorClass="text-[#D4AA00]" icon="fa-solid fa-circle-dot" />
          <StatItem value={resolved} label="Resolved" colorClass="text-[#20a45d]" icon="fa-solid fa-circle-check" />
        </div>
      </Container>
    </div>
  );
}
