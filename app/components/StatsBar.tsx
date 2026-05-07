import { getReportStats } from "@/lib/actions/reportActions";
import Container from "./Container";

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
  const statsResult = await getReportStats();
  const stats = "data" in statsResult && statsResult.data ? statsResult.data : { total: 0, active: 0, resolved: 0 };
  const { total, active, resolved } = stats;

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
