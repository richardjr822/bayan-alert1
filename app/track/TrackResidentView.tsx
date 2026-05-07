"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ReportStatus } from "@/types/report";
import type { ReportWithUpdates } from "@/types/report";
import ReportCard from "@/app/components/client/ReportCard";

type Props = {
  reports: ReportWithUpdates[];
};

const RESOLVED_STATUSES = [ReportStatus.Resolved, ReportStatus.Rejected];

export default function TrackResidentView({ reports }: Props) {
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  const visibleReports = useMemo(
    () => reports.filter((r) => !removedIds.has(r.id)),
    [reports, removedIds],
  );

  function handleCancelSuccess(id: string) {
    setRemovedIds((prev) => new Set(prev).add(id));
    router.refresh();
  }

  return (
    <div className="mx-auto w-[min(680px,92vw)] pb-16">
      <div className="flex items-start justify-between gap-4 pb-6 pt-8">
        <div>
          <h1 className="text-[24px] font-bold text-[var(--dark)]">Your Reports</h1>
          <p className="mt-1 text-[14px] text-[var(--muted)]">
            All your submitted reports, sorted by newest.
          </p>
        </div>
        <Link
          href="/report"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-[7px] bg-[var(--red)] px-4 py-2.5 text-[12px] font-bold text-white transition hover:bg-[var(--red-dark)]"
        >
          <i className="fa-solid fa-circle-exclamation" />
          New Report
        </Link>
      </div>

      {visibleReports.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <svg
            width="56"
            height="56"
            viewBox="0 0 56 56"
            fill="none"
            className="mb-5 opacity-25"
          >
            <path
              d="M28 4L6 16v20c0 11.05 8.4 21.38 22 24 13.6-2.62 22-12.95 22-24V16L28 4z"
              fill="var(--line)"
              stroke="var(--muted)"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M28 20v10M28 34v2"
              stroke="var(--muted)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
          <h3 className="text-[20px] font-semibold text-[var(--text)]">No reports yet</h3>
          <p className="mt-2 text-[14px] text-[var(--muted)]">Stay safe. Report emergencies instantly.</p>
          <Link
            href="/report"
            className="mt-7 inline-flex items-center gap-2 rounded-[8px] bg-[var(--red)] px-7 py-3.5 text-[14px] font-bold text-white transition hover:bg-[var(--red-dark)]"
          >
            <i className="fa-solid fa-circle-exclamation" />
            Report Emergency
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {visibleReports.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              isResolved={RESOLVED_STATUSES.includes(r.status)}
              onCancel={handleCancelSuccess}
            />
          ))}
        </div>
      )}
    </div>
  );
}
