"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelReport } from "@/lib/actions/reportActions";

const CANCEL_REASONS = [
  "Submitted by mistake",
  "Issue resolved on its own",
  "Wrong location captured",
  "Test submission",
];

export default function CancelReportButton({ reportId }: { reportId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(CANCEL_REASONS[0]);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleCancel() {
    setError("");
    startTransition(async () => {
      const result = await cancelReport(reportId, reason);
      if ("error" in result) {
        setError(result.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-[11px] font-medium text-[var(--muted)] underline underline-offset-2 hover:text-[#c0392b] transition"
      >
        Cancel Report
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-[#f3c6c6] bg-[#fff8f8] p-3">
      <p className="mb-2 text-[12px] font-semibold text-[var(--text)]">Reason for cancellation</p>
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-[12px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[rgba(212,170,0,0.2)]"
      >
        {CANCEL_REASONS.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      {error ? <p className="mt-1.5 text-[11px] text-[#c0392b]">{error}</p> : null}
      <div className="mt-2.5 flex gap-2">
        <button
          onClick={handleCancel}
          disabled={isPending}
          className="rounded-md bg-[#c0392b] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#a93226] disabled:opacity-60"
        >
          {isPending ? "Cancelling..." : "Confirm Cancel"}
        </button>
        <button
          onClick={() => { setOpen(false); setError(""); }}
          className="rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-[11px] font-semibold text-[var(--muted)] transition hover:bg-[var(--bg-gray)]"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
