"use server";
// Required SQL (run once in Supabase SQL editor):
// ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_number VARCHAR(20) UNIQUE;
// CREATE INDEX IF NOT EXISTS idx_reports_report_number ON reports(report_number);
// Enable realtime on the reports table in the Supabase dashboard (Database → Replication).

import { supabaseServer } from "@/lib/supabase/server";
import type { PublicTrackingData, PublicStatusUpdate } from "@/types/tracking";
import { ReportStatus, ReportPriority } from "@/types/report";

export async function fetchPublicReport(reportId: string): Promise<PublicTrackingData | null> {
  const { data: report, error } = await supabaseServer
    .from("reports")
    .select("id, incident_type, priority, status, address, created_at, updated_at")
    .eq("id", reportId.trim())
    .maybeSingle();

  if (error || !report) return null;

  const { data: updates } = await supabaseServer
    .from("status_updates")
    .select("id, status, remarks, created_at")
    .eq("report_id", report.id)
    .order("created_at", { ascending: true });

  return {
    report_id: report.id as string,
    incident_type: report.incident_type as string,
    priority: report.priority as ReportPriority,
    status: report.status as ReportStatus,
    address: report.address as string | null,
    created_at: report.created_at as string,
    updated_at: report.updated_at as string,
    status_updates: (updates ?? []) as PublicStatusUpdate[],
  };
}
